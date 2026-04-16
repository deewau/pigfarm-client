import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { claimGift, getUserGifts } from '../controllers/gift.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.post('/claim', claimGift);
router.get('/my', getUserGifts);

export default router;
