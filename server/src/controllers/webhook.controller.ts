import axios from 'axios';
import { Request, Response } from 'express';
import { handleSuccessfulPayment, handleRefundedPayment, sendGiftToUser, GIFTS_DATA } from '../services/telegram.js';
import { userGiftRepository, userRepository, transactionRepository } from '../db/repository.js';
import type { TelegramGift } from '../services/telegram.js';

/**
 * Webhook для получения обновлений от Telegram
 * https://core.telegram.org/bots/api#update
 */
export async function handleTelegramWebhook(req: Request, res: Response) {
  try {
    const update = req.body;

    // Логгируем всё для отладки
    console.log('📩 Webhook received:', JSON.stringify(update, null, 2));

    // Обработка успешного платежа
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;

      await handleSuccessfulPayment(
        payment.telegram_payment_charge_id,
        payment.invoice_payload,
        payment.total_amount
      );
    }

    // Обработка pre_checkout_query — бот должен подтвердить платёж
    if (update.pre_checkout_query) {
      const { pre_checkout_query } = update;
      await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          pre_checkout_query_id: pre_checkout_query.id,
          ok: true,
        }
      );
      console.log(`✅ Pre-checkout query answered: ${pre_checkout_query.id}`);
    }

    // Обработка возврата
    if (update.message?.refunded_payment) {
      const payment = update.message.refunded_payment;

      await handleRefundedPayment(payment.telegram_payment_charge_id);
    }

    // Обработка /start с подарком (gift_{giftId}_{fromUserId}) - только сообщение, не передаём напрямую
    if (update.message?.text && update.message.text.startsWith('/start ')) {
      const payload = update.message.text.replace('/start ', '');
      
      if (payload.startsWith('gift_')) {
        const parts = payload.replace('gift_', '').split('_');
        if (parts.length >= 2) {
          const fromUserId = parseInt(parts[1]);
          const recipientId = update.message.from.id;

          await sendMessage(recipientId, 'Чтобы забрать подарок, открой Mini App: 🎁');
        }
      }
    }

    // Обработка callback_query - убрана для подарков

    // Всегда отвечаем 200 OK
    res.json({ ok: true });
  } catch (error) {
    console.error('handleTelegramWebhook error:', error);
    // Даже при ошиботе отвечаем 200 чтобы Telegram не повторял
    res.json({ ok: true });
  }
}

/**
 * Обработка передачи подарка от одного пользователя другому
 */
async function processGiftTransfer(giftId: number, fromUserId: number, recipientId: number) {
  try {
    // Проверка: если отправитель переходит по своей же ссылке
    if (fromUserId === recipientId) {
      console.log(`🎁 Sender ${fromUserId} tried to claim their own gift`);
      await sendMessage(recipientId, 'Упс, ты чуть не получил подарок, который отправлял другу! 😄\n\nДождись, пока друг заберёт подарок.');
      return;
    }

    // Конвертируем Telegram ID в internal ID
    const senderUser = await userRepository.findByTelegramId(fromUserId);
    if (!senderUser) {
      console.log(`🎁 Sender not found: ${fromUserId}`);
      await sendMessage(recipientId, 'Отправитель не найден.');
      return;
    }

    // Находим подарок в БД
    const userGift = await userGiftRepository.findById(giftId);
    
    if (!userGift) {
      console.log(`🎁 Gift ${giftId} not found`);
      await sendMessage(recipientId, 'Извини, этот подарок уже был отправлен или удалён. 😔');
      return;
    }

    // Сравниваем internal ID
    if (userGift.user_id !== senderUser.id) {
      console.log(`🎁 Gift ${giftId} belongs to user ${userGift.user_id}, but sender is ${senderUser.id}`);
      await sendMessage(recipientId, 'Этот подарок принадлежит другому пользователю.');
      return;
    }

    // Находим данные подарка
    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === userGift.gift_id);
    if (!giftData) {
      console.log(`🎁 Gift data not found for ${userGift.gift_id}`);
      await sendMessage(recipientId, 'Подарок не найден в базе данных.');
      return;
    }

    // Отправляем подарок получателю
    await sendGiftToUser(recipientId, giftData);
    console.log(`🎁 Gift ${giftData.name} sent to ${recipientId}`);

    // Удаляем подарок у отправителя
    await userGiftRepository.delete(giftId);

    // Создаём транзакцию у отправителя
    const senderRecord = await userRepository.findByTelegramId(fromUserId);
    if (senderRecord) {
      await transactionRepository.create({
        user_id: senderRecord.id,
        amount: giftData.stars,
        type: 'withdrawal',
        status: 'completed',
        description: `Подарен другу: ${giftData.name}`,
      });
    }

    // Отправляем уведомления
    await sendMessage(fromUserId, `Ты подарил(а) ${giftData.name} пользователю! 🎁`);
    await sendMessage(recipientId, `Ты получил(а) подарок ${giftData.name}! 🎁\n\nОн появится в твоём профиле.`);
  } catch (error) {
    console.error('processGiftTransfer error:', error);
    await sendMessage(recipientId, 'Произошла ошибка при отправке подарка. Попробуй позже.');
  }
}

/**
 * Отправка сообщения пользователю через бота
 */
async function sendMessage(chatId: number, text: string) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: text,
      }
    );
  } catch (error) {
    console.error('sendMessage error:', error);
  }
}
