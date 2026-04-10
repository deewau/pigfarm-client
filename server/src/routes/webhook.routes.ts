import { Router } from 'express';
import { handleTelegramWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Webhook НЕ требует авторизации — Telegram вызывает напрямую
router.post('/', handleTelegramWebhook);

export default router;
