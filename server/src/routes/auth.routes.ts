import { Router } from 'express';
import { authWithTelegram } from '../controllers/auth.controller.js';

const router = Router();

router.post('/', authWithTelegram);

export default router;
