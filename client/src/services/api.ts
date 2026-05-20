import axios from 'axios';
import type { ApiResponse, AuthResponse, DepositResponse, UserLevel } from '../types';

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
  console.log('[API] request:', config.method?.toUpperCase(), config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API] response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API] error:', error.code, error.message, error.config?.url);
    if (error.response) {
      console.error('[API] response data:', JSON.stringify(error.response.data).slice(0, 300));
    }
    return Promise.reject(error);
  }
);

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
  getXp: async (): Promise<ApiResponse<{ xp: number; level: UserLevel }>> => {
    const response = await api.get<ApiResponse<{ xp: number; level: UserLevel }>>('/api/user/xp');
    return response.data;
  },
  spend: async (amount: number, description?: string): Promise<ApiResponse<{ balance: number }>> => {
    const response = await api.post<ApiResponse<{ balance: number }>>('/api/user/spend', {
      amount,
      description,
    });
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

// Transaction
export const transactionApi = {
  getHistory: async () => {
    const response = await api.get('/api/transactions/history');
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

// Gifts
export const giftApi = {
  getAll: async () => {
    const response = await api.get('/api/gifts');
    return response.data;
  },
};

// Crash
export const crashApi = {
  getHistory: async () => {
    const response = await api.get('/api/crash/history');
    return response.data;
  },
  getCurrent: async () => {
    const response = await api.get('/api/crash/current');
    return response.data;
  },
};

// Plinko
export const plinkoApi = {
  getConfig: async () => {
    const response = await api.get('/api/plinko/config');
    return response.data;
  },
  drop: async (
    betAmount: number,
    rows: number,
    risk: 'low' | 'medium' | 'high',
    clientSeed?: string
  ) => {
    const response = await api.post('/api/plinko/drop', {
      betAmount,
      rows,
      risk,
      clientSeed,
    });
    return response.data;
  },
  getHistory: async (limit = 20, offset = 0) => {
    const response = await api.get(`/api/plinko/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  verify: async (gameId: number) => {
    const response = await api.get(`/api/plinko/verify?gameId=${gameId}`);
    return response.data;
  },
};

// Mines
export const minesApi = {
  start: async (betAmount: number, minesCount: number, clientSeed?: string) => {
    const response = await api.post('/api/mines/start', { betAmount, minesCount, clientSeed });
    return response.data;
  },
  reveal: async (gameId: number, row: number, col: number) => {
    const response = await api.post('/api/mines/reveal', { gameId, row, col });
    return response.data;
  },
  cashout: async (gameId: number) => {
    const response = await api.post('/api/mines/cashout', { gameId });
    return response.data;
  },
  getActive: async () => {
    const response = await api.get('/api/mines/active');
    return response.data;
  },
  getHistory: async (limit = 20, offset = 0) => {
    const response = await api.get(`/api/mines/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  verify: async (gameId: number) => {
    const response = await api.get(`/api/mines/verify?gameId=${gameId}`);
    return response.data;
  },
};

// Win
export const winApi = {
  spin: async (cost: number = 29) => {
    const response = await api.post('/api/win/spin', { cost });
    return response.data;
  },
  claim: async (gift: { id: string; name: string; stars: number }) => {
    const response = await api.post('/api/win/claim', {
      gift_id: gift.id,
      gift_name: gift.name,
      gift_stars: gift.stars,
    });
    return response.data;
  },
  getMy: async () => {
    const response = await api.get('/api/win/my');
    return response.data;
  },
  getRecent: async (limit: number = 20) => {
    const response = await api.get(`/api/win/recent?limit=${limit}`);
    return response.data;
  },
  send: async (userGiftId: number) => {
    const response = await api.post('/api/win/send', { user_gift_id: userGiftId });
    return response.data;
  },
  createTransferInvoice: async (userGiftId: number, friendId: number) => {
    const response = await api.post('/api/win/transfer', {
      user_gift_id: userGiftId,
      friend_id: friendId,
    });
    return response.data;
  },
  sendGiftToFriend: async (userGiftId: number, friendId: number) => {
    const response = await api.post('/api/win/send-to-friend', {
      user_gift_id: userGiftId,
      friend_id: friendId,
    });
    return response.data;
  },
};