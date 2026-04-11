import { Request, Response, NextFunction } from 'express';
import { validateTelegramInitData } from '../utils/telegram.js';
import { userRepository } from '../db/repository.js';
import type { User as UserType } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserType;
    }
  }
}

export async function authenticateTelegram(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;

  if (!initData) {
    res.status(401).json({
      success: false,
      error: 'Missing X-Telegram-Init-Data header',
    });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    res.status(500).json({
      success: false,
      error: 'Server configuration error: TELEGRAM_BOT_TOKEN not set',
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

  // Ищем или создаём пользователя
  let user = await userRepository.findByTelegramId(telegramUser.id);

  if (!user) {
    user = await userRepository.create({
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      username: telegramUser.username,
      language_code: telegramUser.language_code || 'ru',
    });
    console.log(`🆕 New user created: ${user.first_name} (@${user.username || user.telegram_id})`);
  }

  req.user = user;
  next();
}
