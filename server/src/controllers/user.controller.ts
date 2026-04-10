import { Request, Response } from 'express';
import { userRepository, transactionRepository } from '../db/repository.js';

export function getUserProfile(req: Request, res: Response) {
  try {
    const userId = req.params.id ? parseInt(req.params.id as string) : req.user?.id;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const user = userRepository.findById(userId);

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

export function getUserBalance(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const user = userRepository.findById(userId);

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

export function getUserTransactions(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const transactions = transactionRepository.findByUserId(userId);

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
