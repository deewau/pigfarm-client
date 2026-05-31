import { Request, Response } from 'express';
import { getPool } from '../db/connection.js';

export async function getLeaderboard(req: Request, res: Response) {
  try {
    const currentUserId = req.user?.id;

    const pool = getPool();

    const topResult = await pool.query(`
      SELECT
        u.id,
        u.telegram_id,
        u.first_name,
        u.last_name,
        u.username,
        COALESCE(SUM(t.amount), 0) AS total_volume
      FROM users u
      JOIN transactions t ON t.user_id = u.id
      WHERE t.status = 'completed'
        AND t.type IN ('deposit', 'spend')
      GROUP BY u.id
      ORDER BY total_volume DESC
      LIMIT 10
    `);

    const top = topResult.rows.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      telegram_id: row.telegram_id,
      first_name: row.first_name,
      last_name: row.last_name,
      username: row.username,
      total_volume: Number(row.total_volume),
    }));

    let currentUser: (typeof top)[0] & { rank: number } | null = null;

    if (currentUserId) {
      const inTop = top.find((u: any) => u.id === currentUserId);
      if (!inTop) {
        const rankResult = await pool.query(`
          SELECT ranked.rank FROM (
            SELECT
              u.id,
              ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(t.amount), 0) DESC) AS rank
            FROM users u
            JOIN transactions t ON t.user_id = u.id
            WHERE t.status = 'completed'
              AND t.type IN ('deposit', 'spend')
            GROUP BY u.id
          ) ranked WHERE ranked.id = $1
        `, [currentUserId]);

        if (rankResult.rows.length > 0) {
          const userData = await pool.query(
            `SELECT id, telegram_id, first_name, last_name, username FROM users WHERE id = $1`,
            [currentUserId]
          );

          if (userData.rows.length > 0) {
            const u = userData.rows[0];
            currentUser = {
              rank: Number(rankResult.rows[0].rank),
              id: u.id,
              telegram_id: u.telegram_id,
              first_name: u.first_name,
              last_name: u.last_name,
              username: u.username,
              total_volume: 0,
            };

            const volResult = await pool.query(`
              SELECT COALESCE(SUM(amount), 0) AS total_volume
              FROM transactions
              WHERE user_id = $1 AND status = 'completed' AND type IN ('deposit', 'spend')
            `, [currentUserId]);

            currentUser.total_volume = Number(volResult.rows[0].total_volume);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        top,
        currentUser: currentUser || null,
      },
    });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
    });
  }
}
