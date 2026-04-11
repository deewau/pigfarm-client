import { Request, Response } from 'express';
import { validateTelegramInitData } from '../utils/telegram.js';
import { userRepository } from '../db/repository.js';

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
