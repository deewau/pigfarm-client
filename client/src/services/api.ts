import axios from 'axios';
import type { ApiResponse, AuthResponse, DepositResponse } from '../types';

// В разработке используем относительные пути (через Vite proxy),
// в продакшене — VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем interceptor для автоматической подстановки initData
api.interceptors.request.use((config) => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initData) {
    config.headers['X-Telegram-Init-Data'] = tg.initData;
  }
  return config;
});

// Auth
export const authApi = {
  login: async (initData: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/api/auth', { initData });
    return response.data;
  },
};

// User
export const userApi = {
  getBalance: async (): Promise<ApiResponse<{ balance: number }>> => {
    const response = await api.get<ApiResponse<{ balance: number }>>('/api/user/balance');
    return response.data;
  },
};

// Deposit
export const depositApi = {
  create: async (amount: number, description?: string): Promise<ApiResponse<DepositResponse>> => {
    const response = await api.post<ApiResponse<DepositResponse>>('/api/deposit', {
      amount,
      description,
    });
    return response.data;
  },
};

// Referral
export const referralApi = {
  getLink: async () => {
    const response = await api.get('/api/referral/link');
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/api/referral/stats');
    return response.data;
  },
};