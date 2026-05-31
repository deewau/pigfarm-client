import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();

router.get('/', authenticateTelegram, getLeaderboard);

export default router;
