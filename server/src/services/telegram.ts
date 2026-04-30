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
  animationData?: any;
  sticker?: any;
  isSpecial?: boolean;
  isVirt?: boolean;
}

function loadGiftSvg(giftId: string): any {
  try {
    const assetsPath = path.join(__dirname, '..', '..', 'assets', 'svg');
    const filePath = path.join(assetsPath, `${giftId}.svg`);
    const data = fs.readFileSync(filePath, 'utf-8');
    return data;
  } catch (e: any) {
    console.error(`Failed to load SVG for gift ${giftId}:`, e.message);
    return null;
  }
}

function loadGiftAnimation(giftId: string, folder: string = 'gifts'): any {
  try {
    const assetsPath = path.join(__dirname, '..', '..', 'assets', folder);
    const filePath = path.join(assetsPath, `${giftId}.json`);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e: any) {
    console.error(`Failed to load animation for gift ${giftId}:`, e.message);
    return null;
  }
}

// Список фиксированных подарков Telegram с реальными ID
export const GIFTS_DATA: TelegramGift[] = [
  {
    id: '5170145012310081615',
    name: 'Сердце',
    stars: 15,
    animationSvg: loadGiftSvg('5170145012310081615'),
    animationData: loadGiftAnimation('5170145012310081615'),
  },
  {
    id: '5170233102089322756',
    name: 'Мишка',
    stars: 15,
    animationSvg: loadGiftSvg('5170233102089322756'),
    animationData: loadGiftAnimation('5170233102089322756'),
  },
  {
    id: '5170250947678437525',
    name: 'Подарок',
    stars: 25,
    animationSvg: loadGiftSvg('5170250947678437525'),
    animationData: loadGiftAnimation('5170250947678437525'),
  },
  {
    id: '5168103777563050263',
    name: 'Роза',
    stars: 25,
    animationSvg: loadGiftSvg('5168103777563050263'),
    animationData: loadGiftAnimation('5168103777563050263'),
  },
  {
    id: '5170144170496491616',
    name: 'Торт',
    stars: 50,
    animationSvg: loadGiftSvg('5170144170496491616'),
    animationData: loadGiftAnimation('5170144170496491616'),
  },
  {
    id: '5170314324215857265',
    name: 'Букет',
    stars: 50,
    animationSvg: loadGiftSvg('5170314324215857265'),
    animationData: loadGiftAnimation('5170314324215857265'),
  },
  {
    id: '5170564780938756245',
    name: 'Ракета',
    stars: 50,
    animationSvg: loadGiftSvg('5170564780938756245'),
    animationData: loadGiftAnimation('5170564780938756245'),
  },
  {
    id: '6028601630662853006',
    name: 'Шампанское',
    stars: 50,
    animationSvg: loadGiftSvg('6028601630662853006'),
    animationData: loadGiftAnimation('6028601630662853006'),
  },
  {
    id: '5168043875654172773',
    name: 'Кубок',
    stars: 100,
    animationSvg: loadGiftSvg('5168043875654172773'),
    animationData: loadGiftAnimation('5168043875654172773'),
  },
  {
    id: '5170690322832818290',
    name: 'Кольцо',
    stars: 100,
    animationSvg: loadGiftSvg('5170690322832818290'),
    animationData: loadGiftAnimation('5170690322832818290'),
  },
  {
    id: '5170521118301225164',
    name: 'Алмаз',
    stars: 100,
    animationSvg: loadGiftSvg('5170521118301225164'),
    animationData: loadGiftAnimation('5170521118301225164'),
  },
  {
    id: 'vicecream',
    name: 'Мороженое',
    stars: 370,
    animationSvg: loadGiftSvg('vicecream'),
    animationData: loadGiftAnimation('vicecream', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'chillflame',
    name: 'Chill Flame',
    stars: 345,
    animationSvg: loadGiftSvg('chillflame'),
    animationData: loadGiftAnimation('chillflame', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'poolfloat',
    name: 'Pool Float',
    stars: 350,
    animationSvg: loadGiftSvg('poolfloat'),
    animationData: loadGiftAnimation('poolfloat', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'instantramen',
    name: 'Instant Ramen',
    stars: 390,
    animationSvg: loadGiftSvg('instantramen'),
    animationData: loadGiftAnimation('instantramen', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'icecream',
    name: 'Ice Cream',
    stars: 380,
    animationSvg: loadGiftSvg('icecream'),
    animationData: loadGiftAnimation('icecream', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'lolpop',
    name: 'Lol Pop',
    stars: 480,
    animationSvg: loadGiftSvg('lolpop'),
    animationData: loadGiftAnimation('lolpop', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'snakebox',
    name: 'Snake Box',
    stars: 350,
    animationSvg: loadGiftSvg('snakebox'),
    animationData: loadGiftAnimation('snakebox', 'gifts'),
    isSpecial: true,
  },
  {
    id: 'virt240',
    name: 'Virt 240',
    stars: 240,
    animationSvg: loadGiftSvg('virt240'),
    animationData: loadGiftAnimation('virt240'),
    isVirt: true,
  },
  {
    id: 'virt490',
    name: 'Virt 490',
    stars: 490,
    animationSvg: loadGiftSvg('virt490'),
    animationData: loadGiftAnimation('virt490'),
    isVirt: true,
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

export async function sendGiftToUser(telegramId: number, gift: TelegramGift): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  // Используем Telegram Bot API sendGift
  await axios.post(
    `https://api.telegram.org/bot${botToken}/sendGift`,
    {
      user_id: telegramId,
      gift_id: gift.id,
    }
  );
}
