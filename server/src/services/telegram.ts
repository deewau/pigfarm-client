import axios from 'axios';
import type { Transaction } from '../types/index.js';
import { transactionRepository, userRepository } from '../db/repository.js';
import { AppError } from '../middleware/errorHandler.js';

interface CreateInvoiceResult {
  invoiceUrl: string;
  transaction: Transaction;
}

/**
 * Создание invoices для оплаты через Telegram Stars
 * https://core.telegram.org/bots/api#createinvoicelink
 */
export async function createStarsInvoice(
  userId: number,
  amount: number,
  description?: string
): Promise<CreateInvoiceResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new AppError(500, 'TELEGRAM_BOT_TOKEN not configured');
  }

  const user = userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (amount < 1 || amount > 10000) {
    throw new AppError(400, 'Amount must be between 1 and 10000 stars');
  }

  // Создаём pending транзакцию
  const transaction = transactionRepository.create({
    user_id: userId,
    amount,
    type: 'deposit',
    status: 'pending',
    description: description || `Пополнение на ${amount} звёзд`,
  });

  try {
    // Telegram Bot API: создаём invoice link
    // https://core.telegram.org/bots/api#createinvoicelink
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: `Stars Top-Up`,
        description: description || `Пополнение баланса на ${amount} звёзд`,
        payload: `deposit_${transaction.id}`,
        provider_token: '', // Пусто для Stars
        currency: 'XTR', // Telegram Stars
        prices: [
          {
            label: `${amount} Stars`,
            amount: amount, // В звездах
          },
        ],
        max_tip_amount: 0,
        suggested_tip_amounts: [],
        is_flexible: false,
      }
    );

    if (!response.data.ok) {
      throw new AppError(500, `Telegram API error: ${JSON.stringify(response.data)}`);
    }

    const invoiceUrl = response.data.result;

    console.log(`📝 Invoice created: ${amount} stars for user ${userId}`);

    return {
      invoiceUrl,
      transaction,
    };
  } catch (error: any) {
    // Помечаем транзакцию как failed
    transactionRepository.updateStatus(transaction.id, 'failed');

    if (error.response) {
      throw new AppError(500, `Telegram API error: ${error.response.data.description}`);
    }

    throw error;
  }
}

/**
 * Обработка успешной оплаты из webhook
 * https://core.telegram.org/bots/api#successfulpayment
 */
export async function handleSuccessfulPayment(
  telegramPaymentChargeId: string,
  payload: string,
  amount: number
): Promise<void> {
  console.log(`💰 Payment received: ${amount} stars, charge: ${telegramPaymentChargeId}`);

  // Извлекаем ID транзакции из payload
  const transactionId = parseInt(payload.replace('deposit_', ''));
  let transaction = transactionRepository.findById(transactionId);

  if (!transaction) {
    console.error(`Transaction not found: ${transactionId}`);
    return;
  }

  if (transaction.status !== 'pending') {
    console.warn(`Transaction ${transactionId} already processed (status: ${transaction.status})`);
    return;
  }

  // Обновляем транзакцию
  transaction = transactionRepository.updateStatus(transaction.id, 'completed');

  // Начисляем баланс
  userRepository.addBalance(transaction.user_id, amount);

  console.log(`✅ Payment completed: ${amount} stars added to user ${transaction.user_id}`);
}

/**
 * Обработка возврата (refunded)
 */
export async function handleRefundedPayment(
  telegramPaymentChargeId: string
): Promise<void> {
  console.log(`↩️ Payment refunded: ${telegramPaymentChargeId}`);

  const transaction = transactionRepository.findByTelegramChargeId(telegramPaymentChargeId);

  if (!transaction) {
    console.error(`Transaction not found for charge: ${telegramPaymentChargeId}`);
    return;
  }

  transactionRepository.updateStatus(transaction.id, 'refunded');

  // Списываем баланс (возврат)
  const user = userRepository.findById(transaction.user_id);
  if (user && user.balance >= transaction.amount) {
    userRepository.addBalance(transaction.user_id, -transaction.amount);
    console.log(`↩️ Refund processed: ${transaction.amount} stars removed from user ${transaction.user_id}`);
  } else {
    console.warn(`Insufficient balance for refund: user ${transaction.user_id}`);
  }
}
