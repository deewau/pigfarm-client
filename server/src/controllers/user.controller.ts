import { Request, Response } from 'express';
import { userRepository, transactionRepository } from '../db/repository.js';

export async function getUserProfile(req: Request, res: Response) {
  try {
    const userId = req.params.id ? parseInt(req.params.id as string) : req.user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
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

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          balance: user.balance,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
    });
  }
}

export async function getUserBalance(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
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

    res.json({
      success: true,
      data: {
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error('getUserBalance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
    });
  }
}

export async function getUserTransactions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const transactions = await transactionRepository.findByUserId(userId);

    res.json({
      success: true,
      data: {
        transactions,
      },
    });
  } catch (error) {
    console.error('getUserTransactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
}

export async function spendBalance(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid amount',
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

    if (user.balance < amount) {
      res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
      return;
    }

    await userRepository.addBalance(userId, -amount);

    await transactionRepository.create({
      user_id: userId,
      amount,
      type: 'spend',
      status: 'completed',
      description: description || `Списание ${amount} звёзд`,
    });

    const updatedUser = await userRepository.findById(userId);

    console.log(`💸 User ${userId} spent ${amount} stars. Balance: ${updatedUser?.balance}`);

    res.json({
      success: true,
      data: {
        balance: updatedUser?.balance,
      },
    });
  } catch (error) {
    console.error('spendBalance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spend balance',
    });
  }
}

export async function getUserXp(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
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

    res.json({
      success: true,
      data: {
        xp: user.xp,
        level: calculateLevel(user.xp),
      },
    });
  } catch (error) {
    console.error('getUserXp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch XP',
    });
  }
}

function calculateLevel(xp: number): { level: number; currentXp: number; xpForNextLevel: number; progress: number } {
  const levels = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 1000 },
    { level: 3, xpRequired: 2200 },
    { level: 4, xpRequired: 3600 },
    { level: 5, xpRequired: 5200 },
    { level: 6, xpRequired: 7000 },
    { level: 7, xpRequired: 9000 },
    { level: 8, xpRequired: 11200 },
    { level: 9, xpRequired: 13600 },
    { level: 10, xpRequired: 16200 },
  ];

  let currentLevel = 1;
  let xpForNextLevel = 1000;

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xpRequired) {
      currentLevel = levels[i].level;
      xpForNextLevel = i < levels.length - 1 ? levels[i + 1].xpRequired : levels[i].xpRequired + 2000;
      break;
    }
  }

  const previousXp = currentLevel === 1 ? 0 : levels[currentLevel - 1].xpRequired;
  const xpInLevel = xp - previousXp;
  const xpNeeded = xpForNextLevel - previousXp;
  const progress = Math.min((xpInLevel / xpNeeded) * 100, 100);

  return {
    level: currentLevel,
    currentXp: xpInLevel,
    xpForNextLevel: xpNeeded,
    progress,
  };
}
