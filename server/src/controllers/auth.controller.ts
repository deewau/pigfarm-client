import { Request, Response } from 'express';
import axios from 'axios';
import { validateTelegramInitData } from '../utils/telegram.js';
import { userRepository, userGiftRepository, transactionRepository } from '../db/repository.js';
import { sendGiftToUser, GIFTS_DATA } from '../services/telegram.js';
import type { TelegramGift } from '../services/telegram.js';

export async function authWithTelegram(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    if (!initData) {
      res.status(400).json({
        success: false,
        error: 'initData is required',
      });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    const validatedData = validateTelegramInitData(initData, botToken);

    if (!validatedData) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired Telegram init data',
      });
      return;
    }

    const telegramUser = validatedData.user;

    // Получаем реферера из start_param (если есть)
    let referredBy: number | undefined;
    if (validatedData.start_param && validatedData.start_param.startsWith('ref_')) {
      const referrerId = parseInt(validatedData.start_param.replace('ref_', ''));
      if (!isNaN(referrerId)) {
        const referrer = await userRepository.findById(referrerId);
        if (referrer) {
          referredBy = referrerId;
          console.log(`🔗 User referred by ${referrerId}`);
        }
      }
    }

    // Обработка подарка: gift:{giftId}:{fromUserId}
    let pendingGift: { giftId: number; fromUserId: number } | undefined;
    if (validatedData.start_param && validatedData.start_param.startsWith('gift_')) {
      const parts = validatedData.start_param.replace('gift_', '').split('_');
      if (parts.length >= 2) {
        const giftId = parseInt(parts[0]);
        const fromUserId = parseInt(parts[1]);
        if (!isNaN(giftId) && !isNaN(fromUserId)) {
          pendingGift = { giftId, fromUserId };
          console.log(`🎁 Pending gift: ${giftId} from user ${fromUserId}`);
        }
      }
    }

    // Ищем или создаём пользователя
    let user = await userRepository.findByTelegramId(telegramUser.id);

    if (!user) {
      user = await userRepository.create({
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        language_code: telegramUser.language_code || 'ru',
        referredBy,
      });
      console.log(`🆕 New user registered: ${user.first_name} (@${user.username || user.telegram_id})`);
    }

    // Обрабатываем подарок
    if (pendingGift) {
      try {
        const { giftId, fromUserId } = pendingGift;
        
        // Не даём отправить самому себе
        if (fromUserId !== user.telegram_id) {
          await processGiftTransfer(giftId, fromUserId, user.telegram_id, user.id);
        } else {
          console.log(`🎁 Cannot gift to self`);
          await sendTelegramMessage(user.telegram_id, 'Нельзя дарить подарок самому себе! 😅\n\nПоделись ссылкой с другом.');
        }
      } catch (err) {
        console.error('Gift transfer error:', err);
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          username: user.username,
          balance: user.balance,
        },
      },
    });
  } catch (error) {
    console.error('authWithTelegram error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Обработка передачи подарка от одного пользователя другому
 */
async function processGiftTransfer(giftId: number, fromUserId: number, recipientTelegramId: number, recipientUserId: number) {
  try {
    // Конвертируем Telegram ID в internal ID
    const senderUser = await userRepository.findByTelegramId(fromUserId);
    if (!senderUser) {
      console.log(`🎁 Sender not found: ${fromUserId}`);
      await sendTelegramMessage(recipientTelegramId, 'Отправитель не найден.');
      return;
    }

    // Находим подарок в БД
    const userGift = await userGiftRepository.findById(giftId);
    
    if (!userGift) {
      console.log(`🎁 Gift ${giftId} not found`);
      await sendTelegramMessage(recipientTelegramId, 'Извини, этот подарок уже был отправлен или удалён. 😔');
      return;
    }

    // Сравниваем internal ID
    if (userGift.user_id !== senderUser.id) {
      console.log(`🎁 Gift ${giftId} belongs to user ${userGift.user_id}, but sender is ${senderUser.id}`);
      await sendTelegramMessage(recipientTelegramId, 'Этот подарок принадлежит другому пользователю.');
      return;
    }

    // Находим данные подарка
    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === userGift.gift_id);
    if (!giftData) {
      console.log(`🎁 Gift data not found for ${userGift.gift_id}`);
      await sendTelegramMessage(recipientTelegramId, 'Подарок не найден в базе данных.');
      return;
    }

    // Отправляем подарок получателю
    await sendGiftToUser(recipientTelegramId, giftData);
    console.log(`🎁 Gift ${giftData.name} sent to ${recipientTelegramId}`);

    // Удаляем подарок у отправителя
    await userGiftRepository.delete(giftId);
    
    // Создаём транзакцию у отправителя
    await transactionRepository.create({
      user_id: senderUser.id,
      amount: giftData.stars,
      type: 'withdrawal',
      status: 'completed',
      description: `Подарен другу: ${giftData.name}`,
    });

    // Отправляем уведомления
    await sendTelegramMessage(fromUserId, `Ты подарил(а) ${giftData.name} пользователю! 🎁`);
    await sendTelegramMessage(recipientTelegramId, `Ты получил(а) подарок ${giftData.name}! 🎁\n\nОн появится в твоём профиле.`);
  } catch (error) {
    console.error('processGiftTransfer error:', error);
    await sendTelegramMessage(recipientTelegramId, 'Произошла ошибка при отправке подарка. Попробуй позже.');
  }
}

/**
 * Отправка сообщения через бота
 */
async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      { chat_id: chatId, text }
    );
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
  }
}
