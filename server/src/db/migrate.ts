import { getPool } from './connection.js';

export async function runMigrations() {
  const pool = await getPool().connect();
  
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'referred_by'
        ) THEN
          ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
          RAISE NOTICE 'Column referred_by added';
        ELSE
          RAISE NOTICE 'Column referred_by already exists';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'xp'
        ) THEN
          ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0 CHECK(xp >= 0);
          RAISE NOTICE 'Column xp added';
        ELSE
          RAISE NOTICE 'Column xp already exists';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'games'
        ) THEN
          CREATE TABLE games (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            game_type TEXT NOT NULL DEFAULT 'mines',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cashed_out', 'lost', 'completed')),
            bet_amount INTEGER NOT NULL,
            win_amount INTEGER,
            mines_count INTEGER NOT NULL,
            cells TEXT NOT NULL,
            opened_cells TEXT NOT NULL DEFAULT '[]',
            current_multiplier REAL NOT NULL DEFAULT 1.0,
            server_seed TEXT NOT NULL,
            server_seed_hash TEXT NOT NULL,
            client_seed TEXT NOT NULL,
            nonce INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMPTZ,
            finished_at TIMESTAMPTZ
          );
          CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
          CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
          RAISE NOTICE 'Table games created';
        ELSE
          RAISE NOTICE 'Table games already exists';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'plinko_games'
        ) THEN
          CREATE TABLE plinko_games (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            bet_amount INTEGER NOT NULL CHECK(bet_amount > 0),
            rows SMALLINT NOT NULL CHECK(rows >= 8 AND rows <= 16),
            risk TEXT NOT NULL CHECK(risk IN ('low', 'medium', 'high')),
            path JSONB NOT NULL,
            bucket SMALLINT NOT NULL CHECK(bucket >= 0),
            multiplier REAL NOT NULL CHECK(multiplier > 0),
            win_amount INTEGER NOT NULL CHECK(win_amount >= 0),
            profit INTEGER NOT NULL,
            server_seed TEXT NOT NULL,
            server_seed_hash TEXT NOT NULL,
            client_seed TEXT NOT NULL,
            nonce INTEGER NOT NULL CHECK(nonce >= 0),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_plinko_games_user_id ON plinko_games(user_id);
          CREATE INDEX idx_plinko_games_created_at ON plinko_games(created_at DESC);
          CREATE UNIQUE INDEX idx_plinko_games_user_nonce ON plinko_games(user_id, nonce);
          RAISE NOTICE 'Table plinko_games created';
        ELSE
          RAISE NOTICE 'Table plinko_games already exists';
        END IF;
      END $$;
    `);

    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    pool.release();
  }
}