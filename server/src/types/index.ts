export interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'spend';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  telegram_payment_charge_id?: string;
  description?: string;
  created_at: string;
}

export interface CreateInvoicePayload {
  user_id: number;
  amount: number;
  description?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
