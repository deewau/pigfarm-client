import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { createDeposit } from '../controllers/deposit.controller.js';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticateTelegram);

router.post('/', createDeposit);

export default router;
