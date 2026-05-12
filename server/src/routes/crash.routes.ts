import { Router } from 'express';
import { crashGameService } from '../services/crash.service.js';

const router = Router();

router.get('/history', (_req, res) => {
  res.json({ success: true, data: { history: crashGameService.getHistory() } });
});

router.get('/current', (_req, res) => {
  res.json({ success: true, data: { round: crashGameService.getCurrentRoundInfo() } });
});

export default router;
