import { Router } from 'express';
import { getAvailableGifts } from '../services/telegram.js';

const router = Router();

// GET /api/gifts - получить список доступных подарков (без авторизации)
router.get('/', async (req, res) => {
  try {
    const gifts = await getAvailableGifts();
    res.json({ success: true, data: gifts });
  } catch (error: any) {
    console.error('Error fetching gifts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
