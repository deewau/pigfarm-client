import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { claimGift, getUserGifts, sendUserGift, spinRoulette, transferGiftToFriend, sendGiftToFriendHandler, createGiftShareLink, getRecentWins } from '../controllers/gift.controller.js';

const router = Router();

router.use(authenticateTelegram);

router.post('/spin', spinRoulette);
router.post('/claim', claimGift);
router.get('/my', getUserGifts);
router.get('/recent', getRecentWins);
router.post('/send', sendUserGift);
router.post('/transfer', transferGiftToFriend);
router.post('/send-to-friend', sendGiftToFriendHandler);
router.post('/create-gift-link', createGiftShareLink);

export default router;
