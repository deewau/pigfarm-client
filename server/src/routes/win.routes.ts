import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { claimGift, getUserGifts, sendGiftToUser } from '../controllers/gift.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.post('/claim', claimGift);
router.get('/my', getUserGifts);
router.post('/send', sendGiftToUser);

export default router;
