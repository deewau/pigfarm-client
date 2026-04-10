import { useEffect, useState } from 'react';

export function useTelegram() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<string>('light');
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    const log: string[] = [];
    log.push(`window.Telegram exists: ${!!(window as any).Telegram}`);
    log.push(`tg exists: ${!!tg}`);
    log.push(`tg.initDataUnsafe exists: ${!!tg?.initDataUnsafe}`);
    log.push(`tg.initDataUnsafe.user: ${JSON.stringify(tg?.initDataUnsafe?.user)}`);
    log.push(`tg.initData: ${tg?.initData ? 'present (' + tg.initData.substring(0, 50) + '...)' : 'missing'}`);
    log.push(`tg.colorScheme: ${tg?.colorScheme || 'n/a'}`);

    setDebug(log.join(' | '));

    if (tg) {
      tg.ready();
      tg.expand();

      setUser(tg.initDataUnsafe?.user);
      setTheme(tg.colorScheme);

      tg.onEvent('themeChanged', () => {
        setTheme(tg.colorScheme);
      });
    }
  }, []);

  return { user, theme, debug, tg: (window as any).Telegram?.WebApp };
}