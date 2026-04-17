import { getPool } from './connection.js';
import type { User, Transaction } from '../types/index.js';

export const userRepository = {
  async findById(id: number): Promise<User | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as User;
  },

  async findByTelegramId(telegramId: number): Promise<User | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as User;
  },

  async create(data: {
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    referredBy?: number;
  }): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.telegram_id,
        data.first_name,
        data.last_name || null,
        data.username || null,
        data.language_code || 'ru',
        data.referredBy || null,
      ]
    );
    return result.rows[0] as User;
  },

  async updateBalance(userId: number, newBalance: number): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newBalance, userId]
    );
    return result.rows[0] as User;
  },

  async addBalance(userId: number, amount: number): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [amount, userId]
    );
    return result.rows[0] as User;
  },

  async addReferralEarnings(userId: number, amount: number): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE users SET referral_earnings = referral_earnings + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [amount, userId]
    );
    return result.rows[0] as User;
  },

  async getReferrals(userId: number): Promise<User[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE referred_by = $1 ORDER BY created_at DESC', [userId]);
    return result.rows as User[];
  },
};

export const transactionRepository = {
  async create(data: {
    user_id: number;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'spend';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    telegram_payment_charge_id?: string;
    description?: string;
  }): Promise<Transaction> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO transactions (user_id, amount, type, status, telegram_payment_charge_id, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.user_id,
        data.amount,
        data.type,
        data.status,
        data.telegram_payment_charge_id || null,
        data.description || null,
      ]
    );
    return result.rows[0] as Transaction;
  },

  async findById(id: number): Promise<Transaction | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as Transaction;
  },

  async findByTelegramChargeId(chargeId: string): Promise<Transaction | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM transactions WHERE telegram_payment_charge_id = $1', [chargeId]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as Transaction;
  },

  async findByUserId(userId: number): Promise<Transaction[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 AND status != $2 ORDER BY created_at DESC', [userId, 'pending']);
    return result.rows as Transaction[];
  },

  async updateStatus(id: number, status: Transaction['status']): Promise<Transaction> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] as Transaction;
  },
};

export interface UserGift {
  id: number;
  user_id: number;
  gift_id: string;
  gift_name: string;
  gift_stars: number;
  won_at: Date;
}

export const userGiftRepository = {
  async create(data: {
    user_id: number;
    gift_id: string;
    gift_name: string;
    gift_stars: number;
  }): Promise<UserGift> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO user_gifts (user_id, gift_id, gift_name, gift_stars)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.user_id, data.gift_id, data.gift_name, data.gift_stars]
    );
    return result.rows[0] as UserGift;
  },

  async findByUserId(userId: number): Promise<UserGift[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM user_gifts WHERE user_id = $1 ORDER BY won_at DESC',
      [userId]
    );
    return result.rows as UserGift[];
  },

  async findById(id: number): Promise<UserGift | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM user_gifts WHERE id = $1', [id]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as UserGift;
  },

  async delete(id: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM user_gifts WHERE id = $1', [id]);
  },
};
