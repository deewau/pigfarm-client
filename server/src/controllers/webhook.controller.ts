import axios from 'axios';
import { Request, Response } from 'express';
import { handleSuccessfulPayment, handleRefundedPayment } from '../services/telegram.js';

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

    // Всегда отвечаем 200 OK
    res.json({ ok: true });
  } catch (error) {
    console.error('handleTelegramWebhook error:', error);
    // Даже при ошиботе отвечаем 200 чтобы Telegram не повторял
    res.json({ ok: true });
  }
}
