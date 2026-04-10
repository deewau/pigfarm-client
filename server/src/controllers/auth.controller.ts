import { Request, Response } from 'express';
import { validateTelegramInitData } from '../utils/telegram.js';
import { userRepository } from '../db/repository.js';

export async function authWithTelegram(req: Request, res: Response) {
  try {
    const { initData } = req.body;

    console.log('🔐 Auth request received');
    console.log('  initData present:', !!initData);
    console.log('  initData preview:', initData ? initData.substring(0, 80) + '...' : 'missing');

    if (!initData) {
      res.status(400).json({
        success: false,
        error: 'initData is required',
      });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    console.log('  botToken present:', !!botToken);
    if (!botToken) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    console.log('  validating initData...');
    const validatedData = validateTelegramInitData(initData, botToken);
    console.log('  validation result:', validatedData ? 'SUCCESS' : 'FAILED');

    if (!validatedData) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired Telegram init data',
      });
      return;
    }

    const telegramUser = validatedData.user;

    // Ищем или создаём пользователя
    let user = userRepository.findByTelegramId(telegramUser.id);

    if (!user) {
      user = userRepository.create({
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        language_code: telegramUser.language_code || 'ru',
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
