import { useState, useEffect, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async () => {
    const tg = (window as any).Telegram?.WebApp;

    if (!tg?.initData) {
      // Для тестирования вне Telegram — используем mock данные
      console.warn('Telegram WebApp not available, using mock data for development');
      setUser({
        id: 1,
        telegram_id: 999999,
        first_name: 'Тестовый',
        last_name: 'Пользователь',
        username: 'test_user',
        language_code: 'ru',
        balance: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    try {
      setError(null);
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
        console.log('✅ Auth successful:', userData);
      } else {
        setError(response.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Network error');
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
