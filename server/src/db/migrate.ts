import { getPool } from './connection.js';

export async function runMigrations() {
  const pool = await getPool().connect();
  
  try {
    // Добавляем колонку referred_by если её нет
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
    console.log('✅ Migration completed');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    pool.release();
  }
}