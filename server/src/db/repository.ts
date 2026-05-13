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
    console.log(`📊 DB: findByTelegramId(${telegramId})`);
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
      if (result.rows.length === 0) {
        console.log(`📊 DB: no user found for telegram_id=${telegramId}`);
        return undefined;
      }
      const user = result.rows[0] as User;
      console.log(`📊 DB: found user id=${user.id}, telegram_id=${user.telegram_id}, balance=${user.balance}`);
      return user;
    } catch (err) {
      console.error(`📊 DB ERROR:`, err);
      throw err;
    }
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
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.telegram_id, data.first_name, data.last_name || null, data.username || null, data.language_code || 'ru']
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

  async addXp(userId: number, amount: number): Promise<User> {
    const pool = getPool();
    const result = await pool.query(
      'UPDATE users SET xp = xp + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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

  async findRecent(limit: number = 20): Promise<(UserGift & { first_name: string; username: string | null })[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
        ug.id,
        ug.gift_id,
        ug.gift_name,
        ug.gift_stars,
        ug.won_at,
        u.first_name,
        u.username
       FROM user_gifts ug
       JOIN users u ON u.id = ug.user_id
       ORDER BY ug.won_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows as (UserGift & { first_name: string; username: string | null })[];
  },
};

export interface GameRecord {
  id: number;
  user_id: number;
  game_type: string;
  status: 'active' | 'cashed_out' | 'lost' | 'completed';
  bet_amount: number;
  win_amount: number | null;
  mines_count: number;
  cells: string;
  opened_cells: string;
  current_multiplier: number;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const gameRepository = {
  async create(data: {
    user_id: number;
    bet_amount: number;
    mines_count: number;
    cells: string;
    server_seed: string;
    server_seed_hash: string;
    client_seed: string;
  }): Promise<GameRecord> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO games (user_id, game_type, status, bet_amount, mines_count, cells, server_seed, server_seed_hash, client_seed, started_at)
       VALUES ($1, 'mines', 'active', $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [data.user_id, data.bet_amount, data.mines_count, data.cells, data.server_seed, data.server_seed_hash, data.client_seed]
    );
    return result.rows[0] as GameRecord;
  },

  async findById(id: number): Promise<GameRecord | undefined> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as GameRecord;
  },

  async findActiveByUserId(userId: number): Promise<GameRecord | undefined> {
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM games WHERE user_id = $1 AND game_type = 'mines' AND status = 'active' LIMIT 1",
      [userId]
    );
    if (result.rows.length === 0) return undefined;
    return result.rows[0] as GameRecord;
  },

  async updateGame(id: number, data: Partial<{
    status: string;
    win_amount: number;
    opened_cells: string;
    current_multiplier: number;
    finished_at: string;
  }>): Promise<GameRecord> {
    const pool = getPool();
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(data)) {
      sets.push(`${key} = $${idx++}`);
      values.push(val);
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE games SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] as GameRecord;
  },

  async findHistoryByUserId(userId: number, limit: number = 20, offset: number = 0): Promise<GameRecord[]> {
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM games WHERE user_id = $1 AND game_type = 'mines' ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset]
    );
    return result.rows as GameRecord[];
  },
};
