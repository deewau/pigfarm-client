import crypto from 'crypto';

export interface TelegramInitData {
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
  [key: string]: any;
}

/**
 * Валидация Telegram initData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramInitData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const userData = urlParams.get('user');

    if (!hash) return null;

    urlParams.delete('hash');

    const dataCheckArr = Array.from(urlParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckArr)
      .digest('hex');

    if (calculatedHash !== hash) return null;

    if (!userData) return null;

    const parsedUser = JSON.parse(userData);
    const authDate = parseInt(urlParams.get('auth_date') || '0');

    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    urlParams.delete('user');

    return {
      user: parsedUser,
      auth_date: authDate,
      hash,
      ...Object.fromEntries(urlParams),
    };
  } catch (error) {
    console.error('validateTelegramInitData error:', error);
    return null;
  }
}
