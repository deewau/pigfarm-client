import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getUserProfile, getUserBalance, getUserTransactions } from '../controllers/user.controller.js';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticateTelegram);

router.get('/profile', getUserProfile);
router.get('/balance', getUserBalance);
router.get('/transactions', getUserTransactions);

// Получить пользователя по ID (публичный, без авторизации)
router.get('/:id', getUserProfile);

export default router;
