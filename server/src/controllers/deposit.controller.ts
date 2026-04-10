import { Request, Response } from 'express';
import { createStarsInvoice } from '../services/telegram.js';
import { AppError } from '../middleware/errorHandler.js';

export async function createDeposit(req: Request, res: Response) {
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

    if (!amount || typeof amount !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Amount is required and must be a number',
      });
      return;
    }

    const { invoiceUrl, transaction } = await createStarsInvoice(userId, amount, description);

    res.json({
      success: true,
      data: {
        invoiceUrl,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          description: transaction.description,
          created_at: transaction.created_at,
        },
      },
    });
  } catch (error) {
    console.error('createDeposit error:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create deposit invoice',
    });
  }
}
