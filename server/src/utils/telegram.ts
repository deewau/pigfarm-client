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

    console.log('  [validate] hash present:', !!hash);
    console.log('  [validate] userData present:', !!userData);

    if (!hash) {
      console.error('  [validate] No hash in initData');
      return null;
    }

    urlParams.delete('hash');

    const dataCheckArr = Array.from(urlParams.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('  [validate] dataCheckString (first 100):', dataCheckArr.substring(0, 100));

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckArr)
      .digest('hex');

    console.log('  [validate] calculatedHash:', calculatedHash.substring(0, 20) + '...');
    console.log('  [validate] providedHash:', hash.substring(0, 20) + '...');
    console.log('  [validate] hashes match:', calculatedHash === hash);

    if (calculatedHash !== hash) {
      console.error('  [validate] Hash validation failed');
      return null;
    }

    if (!userData) {
      console.error('  [validate] No user data in initData');
      return null;
    }

    const parsedUser = JSON.parse(userData);
    const authDate = parseInt(urlParams.get('auth_date') || '0');

    // Проверяем что данные не старше 24 часов
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.error('  [validate] initData expired');
      return null;
    }

    // Удаляем user чтобы spread не перезаписал объект
    urlParams.delete('user');

    console.log('  [validate] validation SUCCESS for user:', parsedUser.first_name);
    console.log('  [validate] parsedUser:', JSON.stringify(parsedUser));
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
