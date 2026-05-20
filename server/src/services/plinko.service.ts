import type { PoolClient } from 'pg';
import { getPool } from '../db/connection.js';
import { plinkoRepository } from '../db/plinko.repository.js';
import { userRepository } from '../db/repository.js';
import { bucketFromPath } from '../plinko/math.js';
import { getMultiplier, getPayoutTable, exportConfigPayload } from '../plinko/payout-tables.js';
import {
  generateClientSeed,
  generatePlinkoPath,
  generateServerSeed,
  hashServerSeed,
  sanitizeClientSeed,
} from '../plinko/provably-fair.js';
import {
  PLINKO_MAX_BET,
  PLINKO_MAX_ROWS,
  PLINKO_MIN_BET,
  PLINKO_MIN_ROWS,
  PLINKO_RISKS,
  type PlinkoDropResult,
  type PlinkoRisk,
} from '../plinko/types.js';
import { sendBalanceUpdate } from './websocket.js';

type ServiceErrorCode =
  | 'INVALID_BET_AMOUNT'
  | 'INVALID_ROWS'
  | 'INVALID_RISK'
  | 'INVALID_CLIENT_SEED'
  | 'USER_NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'GAME_NOT_FOUND'
  | 'VERIFICATION_FAILED';

export class PlinkoGameService {
  getConfig() {
    return exportConfigPayload();
  }

  isValidRisk(risk: unknown): risk is PlinkoRisk {
    return typeof risk === 'string' && (PLINKO_RISKS as readonly string[]).includes(risk);
  }

  isValidRows(rows: unknown): rows is number {
    return (
      typeof rows === 'number' &&
      Number.isInteger(rows) &&
      rows >= PLINKO_MIN_ROWS &&
      rows <= PLINKO_MAX_ROWS
    );
  }

  isValidBetAmount(amount: unknown): amount is number {
    return (
      typeof amount === 'number' &&
      Number.isInteger(amount) &&
      amount >= PLINKO_MIN_BET &&
      amount <= PLINKO_MAX_BET
    );
  }

  /**
   * Atomic drop: balance lock, outcome, ledger, persist — single DB transaction.
   */
  async drop(
    userId: number,
    betAmount: number,
    rows: number,
    risk: PlinkoRisk,
    clientSeedInput?: string
  ): Promise<{ success: true; data: PlinkoDropResult } | { success: false; error: ServiceErrorCode }> {
    if (!this.isValidBetAmount(betAmount)) {
      return { success: false, error: 'INVALID_BET_AMOUNT' };
    }
    if (!this.isValidRows(rows)) {
      return { success: false, error: 'INVALID_ROWS' };
    }
    if (!this.isValidRisk(risk)) {
      return { success: false, error: 'INVALID_RISK' };
    }

    const sanitized = sanitizeClientSeed(clientSeedInput);
    if (clientSeedInput !== undefined && clientSeedInput !== null && clientSeedInput !== '' && !sanitized) {
      return { success: false, error: 'INVALID_CLIENT_SEED' };
    }

    const pool = getPool();
    const client: PoolClient = await pool.connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query<{ id: number; balance: number }>(
        'SELECT id, balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'USER_NOT_FOUND' };
      }

      const userRow = userResult.rows[0];
      if (userRow.balance < betAmount) {
        await client.query('ROLLBACK');
        return { success: false, error: 'INSUFFICIENT_BALANCE' };
      }

      const nonceResult = await client.query<{ nonce: string }>(
        'SELECT COALESCE(MAX(nonce), -1) + 1 AS nonce FROM plinko_games WHERE user_id = $1',
        [userId]
      );
      const nonce = parseInt(nonceResult.rows[0].nonce, 10);

      const serverSeed = generateServerSeed();
      const serverSeedHash = hashServerSeed(serverSeed);
      const clientSeed = sanitized ?? generateClientSeed();

      const path = generatePlinkoPath(serverSeed, clientSeed, nonce, rows);
      const bucket = bucketFromPath(path);
      const multiplier = getMultiplier(risk, rows, bucket);
      const winAmount = Math.floor(betAmount * multiplier);
      const profit = winAmount - betAmount;
      const newBalance = userRow.balance - betAmount + winAmount;

      await client.query(
        'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, userId]
      );

      const gameResult = await client.query(
        `INSERT INTO plinko_games (
          user_id, bet_amount, rows, risk, path, bucket,
          multiplier, win_amount, profit,
          server_seed, server_seed_hash, client_seed, nonce
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          userId,
          betAmount,
          rows,
          risk,
          JSON.stringify(path),
          bucket,
          multiplier,
          winAmount,
          profit,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
        ]
      );

      const game = gameResult.rows[0];

      await client.query(
        `INSERT INTO transactions (user_id, amount, type, status, description)
         VALUES ($1, $2, 'spend', 'completed', $3)`,
        [userId, betAmount, `Plinko: ставка ${betAmount}⭐ (${rows} рядов, ${risk})`]
      );

      if (winAmount > 0) {
        await client.query(
          `INSERT INTO transactions (user_id, amount, type, status, description)
           VALUES ($1, $2, 'deposit', 'completed', $3)`,
          [
            userId,
            winAmount,
            `Plinko: выигрыш ${betAmount}⭐ ×${multiplier} = ${winAmount}⭐`,
          ]
        );
      }

      await client.query('COMMIT');

      sendBalanceUpdate(userId, newBalance);

      const parsedPath: number[] =
        typeof game.path === 'string' ? JSON.parse(game.path) : game.path;

      return {
        success: true,
        data: {
          gameId: game.id,
          path: parsedPath,
          bucket: game.bucket,
          rows: game.rows,
          risk: game.risk as PlinkoRisk,
          betAmount,
          multiplier: Number(game.multiplier),
          winAmount: game.win_amount,
          profit: game.profit,
          serverSeed: game.server_seed,
          serverSeedHash: game.server_seed_hash,
          clientSeed: game.client_seed,
          nonce: game.nonce,
          balance: newBalance,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PLINKO] drop transaction failed:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getHistory(userId: number, limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const safeOffset = Math.max(0, offset);
    const games = await plinkoRepository.findHistoryByUserId(userId, safeLimit, safeOffset);
    return {
      success: true as const,
      data: {
        games: games.map((g) => ({
          id: g.id,
          betAmount: g.bet_amount,
          rows: g.rows,
          risk: g.risk,
          bucket: g.bucket,
          multiplier: Number(g.multiplier),
          winAmount: g.win_amount,
          profit: g.profit,
          createdAt: g.created_at,
        })),
      },
    };
  }

  async verifyGame(gameId: number, userId?: number) {
    const game = userId
      ? await plinkoRepository.findByIdForUser(gameId, userId)
      : await plinkoRepository.findById(gameId);

    if (!game) {
      return { success: false as const, error: 'GAME_NOT_FOUND' as const };
    }

    const hashOk = hashServerSeed(game.server_seed) === game.server_seed_hash;
    const recomputedPath = generatePlinkoPath(
      game.server_seed,
      game.client_seed,
      game.nonce,
      game.rows
    );
    const recomputedBucket = bucketFromPath(recomputedPath);
    const recomputedMultiplier = getMultiplier(game.risk as PlinkoRisk, game.rows, recomputedBucket);

    const pathOk =
      recomputedPath.length === game.path.length &&
      recomputedPath.every((v, i) => v === game.path[i]);
    const bucketOk = recomputedBucket === game.bucket;
    const multiplierOk = Math.abs(recomputedMultiplier - Number(game.multiplier)) < 0.001;

    const verified = hashOk && pathOk && bucketOk && multiplierOk;

    if (!verified) {
      return { success: false as const, error: 'VERIFICATION_FAILED' as const };
    }

    return {
      success: true as const,
      data: {
        gameId: game.id,
        serverSeed: game.server_seed,
        serverSeedHash: game.server_seed_hash,
        clientSeed: game.client_seed,
        nonce: game.nonce,
        path: game.path,
        bucket: game.bucket,
        rows: game.rows,
        risk: game.risk,
        multiplier: Number(game.multiplier),
        payoutTable: getPayoutTable(game.risk as PlinkoRisk, game.rows),
        verified: true,
      },
    };
  }

  /** Non-transactional balance read for UI */
  async getUserBalance(userId: number): Promise<number | null> {
    const user = await userRepository.findById(userId);
    return user?.balance ?? null;
  }
}

export const plinkoGameService = new PlinkoGameService();
