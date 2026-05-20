import { getPool } from './connection.js';
import type { PlinkoGameRecord, PlinkoRisk } from '../plinko/types.js';

export const plinkoRepository = {
  async getNextNonce(userId: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COALESCE(MAX(nonce), -1) + 1 AS nonce FROM plinko_games WHERE user_id = $1',
      [userId]
    );
    return parseInt((result.rows[0] as { nonce: string }).nonce, 10);
  },

  async create(
    data: {
      user_id: number;
      bet_amount: number;
      rows: number;
      risk: PlinkoRisk;
      path: number[];
      bucket: number;
      multiplier: number;
      win_amount: number;
      profit: number;
      server_seed: string;
      server_seed_hash: string;
      client_seed: string;
      nonce: number;
    },
  ): Promise<PlinkoGameRecord> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO plinko_games (
        user_id, bet_amount, rows, risk, path, bucket,
        multiplier, win_amount, profit,
        server_seed, server_seed_hash, client_seed, nonce
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.user_id,
        data.bet_amount,
        data.rows,
        data.risk,
        JSON.stringify(data.path),
        data.bucket,
        data.multiplier,
        data.win_amount,
        data.profit,
        data.server_seed,
        data.server_seed_hash,
        data.client_seed,
        data.nonce,
      ]
    );
    const row = result.rows[0];
    return {
      ...row,
      path: typeof row.path === 'string' ? JSON.parse(row.path) : row.path,
    };
  },

  async findById(id: number): Promise<PlinkoGameRecord | undefined> {
    const pool = getPool();
    const result = await pool.query<PlinkoGameRecord>(
      'SELECT * FROM plinko_games WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      path: typeof row.path === 'string' ? JSON.parse(row.path) : row.path,
    };
  },

  async findByIdForUser(id: number, userId: number): Promise<PlinkoGameRecord | undefined> {
    const pool = getPool();
    const result = await pool.query<PlinkoGameRecord>(
      'SELECT * FROM plinko_games WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      ...row,
      path: typeof row.path === 'string' ? JSON.parse(row.path) : row.path,
    };
  },

  async findHistoryByUserId(
    userId: number,
    limit: number,
    offset: number
  ): Promise<PlinkoGameRecord[]> {
    const pool = getPool();
    const result = await pool.query<PlinkoGameRecord>(
      `SELECT * FROM plinko_games
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows.map((row) => ({
      ...row,
      path: typeof row.path === 'string' ? JSON.parse(row.path) : row.path,
    }));
  },
};
