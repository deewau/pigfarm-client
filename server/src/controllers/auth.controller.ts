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
        const userTgId = Number(user.telegram_id);
        const fromTgId = Number(fromUserId);
        
        console.log(`🎁 DEBUG: giftId=${giftId}, fromUserId=${fromUserId}, userTgId=${userTgId}, fromTgId=${fromTgId}, equal=${userTgId === fromTgId}`);
        
        // Проверяем, существует ли подарок ещё в БД перед передачей
        const checkGift = await userGiftRepository.findById(giftId);
        if (!checkGift) {
          console.log(`🎁 Gift ${giftId} already processed - skipping`);
        } else if (userTgId === fromTgId) {
          // Блокируем передачу самому себе - отправляем сообщение ТОЛЬКО здесь
          console.log(`🎁 BLOCK SELF-GIFT: sending message to ${userTgId}`);
          await sendTelegramMessage(userTgId, 'Упс, ты чуть не получил подарок, который отправлял другу! 😄\n\nДождись, пока друг заберёт подарок.');
        } else {
          // Нормальная передача подарка
          await processGiftTransfer(giftId, fromTgId, userTgId, user.id);
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
