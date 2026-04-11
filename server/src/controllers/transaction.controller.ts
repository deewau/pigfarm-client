import { Request, Response } from 'express';
import { transactionRepository } from '../db/repository.js';

export async function getTransactionHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const transactions = await transactionRepository.findByUserId(userId);

    res.json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          type: t.type,
          status: t.status,
          description: t.description,
          created_at: t.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('getTransactionHistory error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction history' });
  }
}
