import { Request, Response } from 'express';
import axios from 'axios';
import { userGiftRepository, userRepository, transactionRepository } from '../db/repository.js';
import { GIFTS_DATA, TelegramGift, sendGiftToUser as sendGiftViaApi } from '../services/telegram.js';
import { broadcastNewWin } from '../services/websocket.js';

const GIFT_PROBABILITIES: Record<string, number> = {
  '5170145012310081615': 18.72,
  '5170233102089322756': 18.72,
  '5170250947678437525': 30.63,
  '5168103777563050263': 30.05,
  '5170144170496491616': 0.406,
  '5170314324215857265': 0.506,
  '5170564780938756245': 0.506,
  '6028601630662853006': 0.506,
  '5168043875654172773': 0.715,
  '5170690322832818290': 0.812,
  '5170521118301225164': 0.812,
};

const SPIN_COST_LOW = 25;
const SPIN_COST_HIGH = 50;
const XP_PER_SPIN = 50;

const PROBABILITIES_LOW: Record<string, number> = {
  '5170145012310081615': 18.72,
  '5170233102089322756': 18.72,
  '5170250947678437525': 30.63,
  '5168103777563050263': 30.05,
  '5170144170496491616': 0.406,
  '5170314324215857265': 0.506,
  '5170564780938756245': 0.506,
  '6028601630662853006': 0.506,
  '5168043875654172773': 0.715,
  '5170690322832818290': 0.812,
  '5170521118301225164': 0.812,
};

const PROBABILITIES_HIGH: Record<string, number> = {
  '5170250947678437525': 9.16,
  '5168103777563050263': 9.16,
  '6028601630662853006': 13.40,
  '5170564780938756245': 13.40,
  '5170314324215857265': 13.40,
  '5170144170496491616': 13.40,
  'chillflame': 0.99,
  'poolfloat': 0.89,
  'instantramen': 0.84,
  'icecream': 0.91,
  'lolpop': 0.70,
  'snakebox': 0.81,
  '5170690322832818290': 3.50,
  '5170521118301225164': 3.50,
  '5168043875654172773': 3.50,
};

function weightedRandomSelect(gifts: TelegramGift[], probabilities: Record<string, number>): TelegramGift {
  const totalWeight = gifts.reduce((sum, item) => sum + (probabilities[item.id] || 0), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of gifts) {
    const weight = probabilities[item.id] || 0;
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return gifts[gifts.length - 1];
}

function getGiftsForCost(cost: number): TelegramGift[] {
  if (cost === SPIN_COST_HIGH) {
    return GIFTS_DATA.filter(g => [25, 50, 100, 345, 350, 370, 380, 390, 480].includes(g.stars) || g.isSpecial);
  }
  return GIFTS_DATA;
}

function getProbabilitiesForCost(cost: number): Record<string, number> {
  return cost === SPIN_COST_HIGH ? PROBABILITIES_HIGH : PROBABILITIES_LOW;
}

function getSpinCost(cost: number): number {
  return cost === SPIN_COST_HIGH ? SPIN_COST_HIGH : SPIN_COST_LOW;
}

export async function spinRoulette(req: Request, res: Response) {
  let userId: number | undefined;
  
  try {
    userId = req.user?.id;
    console.log('🎰 spinRoulette called:', { userId, body: req.body });

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const cost = req.body.cost || SPIN_COST_LOW;
    const spinCost = getSpinCost(cost);
    const gifts = getGiftsForCost(cost);
    const probabilities = getProbabilitiesForCost(cost);

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (user.balance < spinCost) {
      res.status(400).json({
        success: false,
        error: 'Insufficient_balance',
        needed: spinCost,
        current: user.balance,
      });
      return;
    }

    const wonGift = weightedRandomSelect(gifts, probabilities);
    console.log('🎰 Won gift:', wonGift.name);

    await userRepository.addBalance(userId, -spinCost);

    const gift = await userGiftRepository.create({
      user_id: userId,
      gift_id: wonGift.id,
      gift_name: wonGift.name,
      gift_stars: wonGift.stars,
    });

    await transactionRepository.create({
      user_id: userId,
      amount: spinCost,
      type: 'spend',
      status: 'completed',
      description: `Крутка рулетки (${spinCost}⭐): выигран ${wonGift.name}`,
    });

    await userRepository.addXp(userId, XP_PER_SPIN);

    const updatedUser = await userRepository.findById(userId);
    console.log(`🎰 Spin complete: ${wonGift.name} for user ${userId}. Balance: ${updatedUser?.balance}`);

    // Broadcast new win to all live feed clients
    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === wonGift.id);
    if (updatedUser) {
      broadcastNewWin({
        id: gift.id,
        gift_id: wonGift.id,
        gift_name: wonGift.name,
        gift_stars: wonGift.stars,
        won_at: new Date().toISOString(),
        first_name: updatedUser.first_name,
        username: updatedUser.username ?? null,
        animationSvg: giftData?.animationSvg || null,
      });
    }

    res.json({
      success: true,
      data: {
        gift: {
          id: wonGift.id,
          name: wonGift.name,
          stars: wonGift.stars,
          animationSvg: wonGift.animationSvg,
          animationData: wonGift.animationData,
          isSpecial: wonGift.isSpecial || false,
        },
        balance: updatedUser?.balance,
      },
    });
  } catch (error) {
    console.error('spinRoulette error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spin roulette',
    });
  }
}

export async function claimGift(req: Request, res: Response) {
  let userId: number | undefined;
  
  try {
    userId = req.user?.id;
    console.log('🎁 claimGift called:', { userId, body: req.body });

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { gift_id, gift_name, gift_stars } = req.body;

    if (!gift_id || !gift_name || !gift_stars) {
      res.status(400).json({
        success: false,
        error: 'Missing gift data',
      });
      return;
    }

    console.log('🎁 Creating gift in DB...');
    const gift = await userGiftRepository.create({
      user_id: userId,
      gift_id,
      gift_name,
      gift_stars,
    });

    console.log('🎁 Gift saved to DB:', gift);

    // Записываем в историю
    try {
      const tx = await transactionRepository.create({
        user_id: userId,
        amount: gift_stars,
        type: 'deposit',
        status: 'completed',
        description: `Выигран подарок: ${gift_name}`,
      });
      console.log('💾 Transaction created:', tx);
    } catch (txErr) {
      console.error('💾 Failed to create transaction:', txErr);
    }

    console.log(`🎁 Gift claimed: ${gift_name} (${gift_stars}⭐) for user ${userId}`);

    res.json({
      success: true,
      data: { gift },
    });
  } catch (error) {
    console.error('claimGift error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim gift',
    });
  }
}

export async function getUserGifts(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const gifts = await userGiftRepository.findByUserId(userId);

    // Добавляем SVG данные к подаркам
    const giftsWithSvg = gifts.map(gift => {
      const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === gift.gift_id);
      return {
        ...gift,
        animationSvg: giftData?.animationSvg || null,
        animationData: giftData?.animationData || null,
      };
    });

    res.json({
      success: true,
      data: { gifts: giftsWithSvg },
    });
  } catch (error) {
    console.error('getUserGifts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gifts',
    });
  }
}

export async function sendUserGift(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { user_gift_id } = req.body;

    console.log('📤 sendUserGift called:', { userId, user_gift_id });

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!user_gift_id) {
      res.status(400).json({
        success: false,
        error: 'Missing gift ID',
      });
      return;
    }

    const userGift = await userGiftRepository.findById(user_gift_id);
    console.log('📤 userGift found:', userGift);
    
    if (!userGift) {
      res.status(404).json({
        success: false,
        error: 'Gift not found',
      });
      return;
    }

    if (userGift.user_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Not your gift',
      });
      return;
    }

    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === userGift.gift_id);
    console.log('📤 giftData found:', giftData);
    
    if (!giftData) {
      res.status(400).json({
        success: false,
        error: 'Gift not found in database',
      });
      return;
    }

    const user = await userRepository.findById(userId);
    console.log('📤 user found:', user?.telegram_id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Отправляем подарок через Telegram бот
    console.log('📤 Sending gift to Telegram:', user.telegram_id, giftData.id);
    await sendGiftViaApi(user.telegram_id, giftData);
    console.log('📤 Gift sent successfully!');

    // Удаляем подарок из БД после отправки
    await userGiftRepository.delete(user_gift_id);
    console.log('📤 Gift deleted from DB');

    // Создаем запись в истории о отправке подарка
    await transactionRepository.create({
      user_id: userId,
      amount: giftData.stars,
      type: 'withdrawal',
      status: 'completed',
      description: `Отправлен подарок: ${giftData.name}`,
    });
    console.log('📤 Transaction created');

    res.json({
      success: true,
      data: { message: 'Gift sent!' },
    });
  } catch (error) {
    console.error('sendUserGift error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send gift',
    });
  }
}

export async function transferGiftToFriend(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { user_gift_id, friend_id } = req.body;

    console.log('📤 transferGiftToFriend called:', { userId, user_gift_id, friend_id });

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    if (!user_gift_id) {
      res.status(400).json({
        success: false,
        error: 'Missing gift ID',
      });
      return;
    }

    const userGift = await userGiftRepository.findById(user_gift_id);
    if (!userGift || userGift.user_id !== userId) {
      res.status(404).json({
        success: false,
        error: 'Gift not found',
      });
      return;
    }

    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === userGift.gift_id);
    if (!giftData) {
      res.status(400).json({
        success: false,
        error: 'Gift not found in database',
      });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({
        success: false,
        error: 'Bot not configured',
      });
      return;
    }

    const invoicePayload = JSON.stringify({
      type: 'gift_transfer',
      user_gift_id,
      gift_id: giftData.id,
      from_user_id: userId,
    });

    const invoiceLink = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: `Подарок: ${giftData.name}`,
        description: `Перевод подарка "${giftData.name}" (${giftData.stars} ⭐) другу`,
        payload: invoicePayload,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: 'Подарок', amount: giftData.stars }],
      }
    );

    console.log('📤 Invoice link created:', invoiceLink.data);

    res.json({
      success: true,
      data: {
        invoiceUrl: invoiceLink.data,
      },
    });
  } catch (error) {
    console.error('transferGiftToFriend error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transfer invoice',
    });
  }
}

export async function sendGiftToFriendHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { user_gift_id, friend_id } = req.body;

    console.log('📤 sendGiftToFriend called:', { userId, user_gift_id, friend_id });

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!user_gift_id || !friend_id) {
      res.status(400).json({ success: false, error: 'Missing parameters' });
      return;
    }

    const userGift = await userGiftRepository.findById(user_gift_id);
    if (!userGift || userGift.user_id !== userId) {
      res.status(404).json({ success: false, error: 'Gift not found' });
      return;
    }

    const giftData = GIFTS_DATA.find((g: TelegramGift) => g.id === userGift.gift_id);
    if (!giftData) {
      res.status(400).json({ success: false, error: 'Gift not found in database' });
      return;
    }

    await sendGiftViaApi(friend_id, giftData);
    console.log('📤 Gift sent to friend:', friend_id);

    await userGiftRepository.delete(user_gift_id);

    await transactionRepository.create({
      user_id: userId,
      amount: giftData.stars,
      type: 'withdrawal',
      status: 'completed',
      description: `Отправлен подарок другу: ${giftData.name}`,
    });

    res.json({ success: true, data: { message: 'Gift sent to friend!' } });
  } catch (error) {
    console.error('sendGiftToFriend error:', error);
    res.status(500).json({ success: false, error: 'Failed to send gift to friend' });
  }
}

export async function getRecentWins(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const wins = await userGiftRepository.findRecent(limit);

    const winsWithSvg = wins.map(win => {
      const giftData = GIFTS_DATA.find((g: any) => g.id === win.gift_id);
      return {
        ...win,
        animationSvg: giftData?.animationSvg || null,
      };
    });

    res.json({
      success: true,
      data: { wins: winsWithSvg },
    });
  } catch (error) {
    console.error('getRecentWins error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent wins',
    });
  }
}

export async function createGiftShareLink(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { gift_id, payload } = req.body;

    console.log('🔗 createGiftShareLink called:', { userId, gift_id, payload });

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'piggitbot';
    const link = `https://t.me/${botUsername}?startapp=${payload}`;

    console.log('🔗 Created link:', link);

    res.json({
      success: true,
      data: { link },
    });
  } catch (error) {
    console.error('createGiftShareLink error:', error);
    res.status(500).json({ success: false, error: 'Failed to create link' });
  }
}
