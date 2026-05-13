import { Router } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { minesGameService } from '../services/mines.service.js';

const router = Router();

router.use(authenticateTelegram);

router.post('/start', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const { betAmount, minesCount, clientSeed } = req.body;
    const result = await minesGameService.startGame(userId, betAmount, minesCount, clientSeed);
    if (!result.success) {
      const status = result.error === 'INSUFFICIENT_BALANCE' ? 400 :
                     result.error === 'CONCURRENT_GAME_EXISTS' ? 409 : 400;
      res.status(status).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Mines start error:', error);
    res.status(500).json({ success: false, error: 'Failed to start game' });
  }
});

router.post('/reveal', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const { gameId, row, col } = req.body;
    const result = await minesGameService.revealCell(userId, gameId, row, col);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Mines reveal error:', error);
    res.status(500).json({ success: false, error: 'Failed to reveal cell' });
  }
});

router.post('/cashout', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const { gameId } = req.body;
    const result = await minesGameService.cashOut(userId, gameId);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Mines cashout error:', error);
    res.status(500).json({ success: false, error: 'Failed to cash out' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const result = await minesGameService.getActiveGame(userId);
    res.json(result);
  } catch (error) {
    console.error('Mines active error:', error);
    res.status(500).json({ success: false, error: 'Failed to get active game' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await minesGameService.getHistory(userId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Mines history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const gameId = parseInt(req.query.gameId as string);
    if (!gameId) { res.status(400).json({ success: false, error: 'Missing gameId' }); return; }
    const result = await minesGameService.verifyGame(gameId);
    if (!result.success) { res.status(404).json(result); return; }
    res.json(result);
  } catch (error) {
    console.error('Mines verify error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify game' });
  }
});

export default router;
