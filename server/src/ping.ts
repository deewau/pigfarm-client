// Пинг-сервис — предотвращает засыпание Render на free plan
// Запуск: npm run ping
// Или добавь в cron: каждые 5 минут

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

const rootEnvPath = 'd:/pigfarm/.env';
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
}

const url = process.env.TELEGRAM_WEBHOOK_URL?.replace('/api/webhook', '');

if (!url) {
  console.error('❌ URL not set');
  process.exit(1);
}

async function ping() {
  try {
    const start = Date.now();
    await axios.get(`${url}/api/health`, { timeout: 10000 });
    const elapsed = Date.now() - start;
    console.log(`${new Date().toISOString()} ✅ Ping OK (${elapsed}ms)`);
  } catch (error: any) {
    console.error(`${new Date().toISOString()} ❌ Ping failed:`, error.message);
  }
}

// Пингуем раз в 5 минут
ping();
setInterval(ping, 5 * 60 * 1000);
