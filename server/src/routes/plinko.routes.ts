import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { plinkoGameService } from '../services/plinko.service.js';

const router = Router();

router.get('/config', (_req, res) => {
  res.json({ success: true, data: plinkoGameService.getConfig() });
});

router.use(authenticateTelegram);

router.post('/drop', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { betAmount, rows, risk, clientSeed } = req.body;
    const result = await plinkoGameService.drop(userId, betAmount, rows, risk, clientSeed);

    if (!result.success) {
      const status =
        result.error === 'INSUFFICIENT_BALANCE' ? 400 :
        result.error === 'USER_NOT_FOUND' ? 404 : 400;
      res.status(status).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('[PLINKO] drop error:', error);
    res.status(500).json({ success: false, error: 'Failed to play plinko' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const result = await plinkoGameService.getHistory(userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('[PLINKO] history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const userId = req.user?.id;
    const gameId = parseInt(req.query.gameId as string, 10);
    if (!gameId) {
      res.status(400).json({ success: false, error: 'Missing gameId' });
      return;
    }

    const result = await plinkoGameService.verifyGame(gameId, userId);
    if (!result.success) {
      const status = result.error === 'GAME_NOT_FOUND' ? 404 : 400;
      res.status(status).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('[PLINKO] verify error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify game' });
  }
});

export default router;
