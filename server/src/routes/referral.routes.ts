import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { getReferralLink, getReferralStats } from '../controllers/referral.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.get('/link', getReferralLink);
router.get('/stats', getReferralStats);

export default router;
