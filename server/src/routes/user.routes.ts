import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getUserProfile, getUserBalance, getUserTransactions, spendBalance, getUserXp } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.get('/xp', getUserXp);
router.get('/balance', getUserBalance);
router.get('/transactions', getUserTransactions);
router.get('/profile', getUserProfile);
router.post('/spend', spendBalance);

export default router;
