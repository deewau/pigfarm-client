import { useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import type { User, UserLevel } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel | null>(() => {
    const cached = localStorage.getItem('pigfarm_userLevel');
    return cached ? JSON.parse(cached) : null;
  });

  const login = useCallback(async () => {
    const tg = (window as any).Telegram?.WebApp;

    try {
      setError(null);

      if (!tg?.initData) {
        console.warn('Telegram WebApp initData not available');
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await authApi.login(tg.initData);

      if (response.success && response.data) {
        const userData = response.data.user;
        setUser({
          id: userData.id,
          telegram_id: userData.telegram_id,
          first_name: userData.first_name,
          username: userData.username,
          language_code: tg.initDataUnsafe?.user?.language_code || 'ru',
          balance: userData.balance,
          xp: userData.xp || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_name: tg.initDataUnsafe?.user?.last_name,
        });
      } else {
        setError(response.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!user) return;

    try {
      const response = await userApi.getBalance();
      if (response.success && response.data) {
        setUser((prev) => (prev ? { ...prev, balance: response.data!.balance } : null));
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [user]);

  const refreshXp = useCallback(async () => {
    try {
      const response = await userApi.getXp();
      if (response.success && response.data) {
        setUserLevel(response.data);
        setUser((prev) => (prev ? { ...prev, xp: response.data!.currentXp } : null));
        const levelData = JSON.stringify(response.data);
        localStorage.setItem('pigfarm_userLevel', levelData);
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'pigfarm_userLevel',
          newValue: levelData
        }));
      }
    } catch (err) {
      console.error('Failed to refresh XP:', err);
      const cached = localStorage.getItem('pigfarm_userLevel');
      if (cached) {
        setUserLevel(JSON.parse(cached));
      }
    }
  }, []);

  // Мгновенное обновление баланса на клиенте
  const addBalance = useCallback((amount: number) => {
    setUser((prev) => (prev ? { ...prev, balance: prev.balance + amount } : null));
  }, []);

  useEffect(() => {
    login();
  }, [login]);

  return {
    user,
    loading,
    error,
    refreshBalance,
    refreshXp,
    userLevel,
    setUserLevel,
    addBalance,
    login,
  };
}
