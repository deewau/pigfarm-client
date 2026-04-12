import axios from 'axios';
import type { Transaction } from '../types/index.js';
import { transactionRepository, userRepository } from '../db/repository.js';
import { AppError } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreateInvoiceResult {
  invoiceUrl: string;
  transaction: Transaction;
}

export async function createStarsInvoice(
  userId: number,
  amount: number,
  description?: string
): Promise<CreateInvoiceResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new AppError(500, 'TELEGRAM_BOT_TOKEN not configured');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  if (amount < 1 || amount > 10000) {
    throw new AppError(400, 'Amount must be between 1 and 10000 stars');
  }

  const transaction = await transactionRepository.create({
    user_id: userId,
    amount,
    type: 'deposit',
    status: 'pending',
    description: description || `Пополнение на ${amount} звёзд`,
  });

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: `Stars Top-Up`,
        description: description || `Пополнение баланса на ${amount} звёзд`,
        payload: `deposit_${transaction.id}`,
        provider_token: '',
        currency: 'XTR',
        prices: [
          {
            label: `${amount} Stars`,
            amount: amount,
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

    console.log(`📝 Invoice created: ${amount} stars for user ${userId}`);

    return {
      invoiceUrl: response.data.result,
      transaction,
    };
  } catch (error: any) {
    await transactionRepository.updateStatus(transaction.id, 'failed');

    if (error.response) {
      throw new AppError(500, `Telegram API error: ${error.response.data.description}`);
    }

    throw error;
  }
}

export async function handleSuccessfulPayment(
  telegramPaymentChargeId: string,
  payload: string,
  amount: number
): Promise<void> {
  console.log(`💰 Payment received: ${amount} stars, charge: ${telegramPaymentChargeId}`);

  const transactionId = parseInt(payload.replace('deposit_', ''));
  let transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    console.error(`Transaction not found: ${transactionId}`);
    return;
  }

  if (transaction.status !== 'pending') {
    console.warn(`Transaction ${transactionId} already processed (status: ${transaction.status})`);
    return;
  }

  await transactionRepository.updateStatus(transaction.id, 'completed');
  await userRepository.addBalance(transaction.user_id, amount);

  // Начисляем 10% пригласившему
  const user = await userRepository.findById(transaction.user_id);
  if (user?.referred_by) {
    const commission = Math.floor(amount * 0.1); // 10%
    if (commission > 0) {
      await userRepository.addBalance(user.referred_by, commission);
      await userRepository.addReferralEarnings(user.referred_by, commission);
      console.log(`🎁 Referral bonus: ${commission} stars to user ${user.referred_by}`);
    }
  }

  console.log(`✅ Payment completed: ${amount} stars added to user ${transaction.user_id}`);
}

export async function handleRefundedPayment(
  telegramPaymentChargeId: string
): Promise<void> {
  console.log(`↩️  Payment refunded: ${telegramPaymentChargeId}`);

  const transaction = await transactionRepository.findByTelegramChargeId(telegramPaymentChargeId);

  if (!transaction) {
    console.error(`Transaction not found for charge: ${telegramPaymentChargeId}`);
    return;
  }

  await transactionRepository.updateStatus(transaction.id, 'refunded');

  const user = await userRepository.findById(transaction.user_id);
  if (user && user.balance >= transaction.amount) {
    await userRepository.addBalance(transaction.user_id, -transaction.amount);
    console.log(`↩️  Refund processed: ${transaction.amount} stars removed from user ${transaction.user_id}`);
  } else {
    console.warn(`Insufficient balance for refund: user ${transaction.user_id}`);
  }
}

export interface TelegramGift {
  id: string;
  name: string;
  description?: string;
  stars: number;
  animationSvg?: string;
  sticker?: any;
}

function loadGiftAnimation(giftId: string): any {
  try {
    // Загружаем SVG файл и возвращаем как строку для inline отображения
    const assetsPath = path.join(__dirname, '..', '..', 'assets', 'svg');
    const filePath = path.join(assetsPath, `${giftId}.svg`);
    console.log(`Loading SVG from: ${filePath}`);
    const data = fs.readFileSync(filePath, 'utf-8');
    return data; // Возвращаем SVG как строку
  } catch (e: any) {
    console.error(`Failed to load SVG for gift ${giftId}:`, e.message);
    return null;
  }
}

// Список фиксированных подарков Telegram с реальными ID
const GIFTS_DATA: TelegramGift[] = [
  {
    id: '5170145012310081615',
    name: 'Сердце с бантом',
    stars: 15,
    animationData: loadGiftAnimation('5170145012310081615'),
  },
  {
    id: '5170250947678437525',
    name: 'Подарок',
    stars: 25,
    animationData: loadGiftAnimation('5170250947678437525'),
  },
  {
    id: '5168103777563050263',
    name: 'Роза',
    stars: 25,
    animationData: loadGiftAnimation('5168103777563050263'),
  },
];

export async function getGiftById(giftId: string): Promise<TelegramGift | null> {
  const gift = GIFTS_DATA.find(g => g.id === giftId);
  if (!gift) {
    console.error(`Gift ${giftId} not found in static data`);
    return null;
  }
  return gift;
}

export async function getAvailableGifts(): Promise<TelegramGift[]> {
  return GIFTS_DATA;
}
