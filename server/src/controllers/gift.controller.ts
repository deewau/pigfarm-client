import { Request, Response } from 'express';
import { userGiftRepository, userRepository, transactionRepository } from '../db/repository.js';
import { GIFTS_DATA, TelegramGift, sendGiftToUser as sendGiftViaApi } from '../services/telegram.js';

export async function claimGift(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

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

    const gift = await userGiftRepository.create({
      user_id: userId,
      gift_id,
      gift_name,
      gift_stars,
    });

    // Записываем в историю
    await transactionRepository.create({
      user_id: userId,
      amount: gift_stars,
      type: 'deposit',
      status: 'completed',
      description: `Выигран подарок: ${gift_name}`,
    });

    console.log(`🎁 Gift claimed: ${gift_name} for user ${userId}`);

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
    if (!giftData) {
      res.status(400).json({
        success: false,
        error: 'Gift not found in database',
      });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Отправляем подарок через Telegram бот
    await sendGiftViaApi(user.telegram_id, giftData);

    // Удаляем подарок из БД после отправки
    await userGiftRepository.delete(user_gift_id);

    // Создаем запись в истории о отправке подарка
    await transactionRepository.create({
      user_id: userId,
      amount: giftData.stars,
      type: 'withdrawal',
      status: 'completed',
      description: `Отправлен подарок: ${giftData.name}`,
    });

    console.log(`🎁 Gift sent: ${giftData.name} to user ${userId}`);

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
