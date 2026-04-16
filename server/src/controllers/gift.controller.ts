import { Request, Response } from 'express';
import { userGiftRepository, userRepository, transactionRepository } from '../db/repository.js';
import { GIFTS_DATA } from '../services/telegram.js';

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
      const giftData = GIFTS_DATA.find(g => g.id === gift.gift_id);
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
