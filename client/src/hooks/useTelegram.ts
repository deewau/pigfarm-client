import { useEffect, useState } from 'react';

export function useTelegram() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<string>('light');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
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

  return { user, theme, tg: (window as any).Telegram?.WebApp };
}