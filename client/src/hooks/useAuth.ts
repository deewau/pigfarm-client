import { useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    login();
  }, [login]);

  return {
    user,
    loading,
    error,
    refreshBalance,
    login,
  };
}
