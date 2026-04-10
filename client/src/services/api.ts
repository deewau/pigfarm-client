import axios from 'axios';
import type { ApiResponse, AuthResponse, DepositResponse, User, Transaction } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  getProfile: async (userId?: number): Promise<ApiResponse<{ user: User }>> => {
    const url = userId ? `/api/user/${userId}` : '/api/user/profile';
    const response = await api.get<ApiResponse<{ user: User }>>(url);
    return response.data;
  },

  getBalance: async (): Promise<ApiResponse<{ balance: number }>> => {
    const response = await api.get<ApiResponse<{ balance: number }>>('/api/user/balance');
    return response.data;
  },

  getTransactions: async (): Promise<ApiResponse<{ transactions: Transaction[] }>> => {
    const response = await api.get<ApiResponse<{ transactions: Transaction[] }>>('/api/user/transactions');
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