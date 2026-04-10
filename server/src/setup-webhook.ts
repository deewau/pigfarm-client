// Настройка webhook для Telegram бота
// Запуск: npm run webhook:setup

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';

const rootEnvPath = 'd:/pigfarm/.env';

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const baseUrl = process.env.TELEGRAM_WEBHOOK_URL;

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

if (!baseUrl || baseUrl.includes('your-domain')) {
  console.error('❌ TELEGRAM_WEBHOOK_URL not set or contains placeholder');
  console.error('Current value:', baseUrl);
  process.exit(1);
}

async function setupWebhook() {
  try {
    console.log('🗑️  Deleting old webhook...');
    await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`);

    console.log(`🔗 Setting webhook to: ${baseUrl}`);
    const response = await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: baseUrl,
      allowed_updates: ['message', 'pre_checkout_query'],
    });

    if (response.data.ok) {
      console.log('✅ Webhook set successfully!');

      const info = await axios.get(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      console.log('📋 Webhook info:', JSON.stringify(info.data.result, null, 2));
    } else {
      console.error('❌ Failed:', response.data);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

setupWebhook();
