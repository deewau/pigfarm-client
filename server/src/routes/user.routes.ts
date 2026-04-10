import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getUserProfile, getUserBalance, getUserTransactions } from '../controllers/user.controller.js';

const router = Router();

// Публичный роут — должен быть ДО middleware
router.get('/:id', getUserProfile);

// Все остальные роуты требуют авторизации
router.use(authenticateTelegram);

router.get('/profile', getUserProfile);
router.get('/balance', getUserBalance);
router.get('/transactions', getUserTransactions);

export default router;
