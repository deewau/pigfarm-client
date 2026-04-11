import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getTransactionHistory } from '../controllers/transaction.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.get('/history', getTransactionHistory);

export default router;
