// Миграции для базы данных
// Запуск: npm run db:migrate

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../pigfarm.db');

const migrations = [
  {
    name: '001_initial_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        language_code TEXT DEFAULT 'ru',
        balance INTEGER DEFAULT 0 CHECK(balance >= 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL CHECK(amount > 0),
        type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'spend')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
        telegram_payment_charge_id TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_telegram_charge_id ON transactions(telegram_payment_charge_id);
    `,
  },
];

async function runMigrations() {
  const SQL = await initSqlJs();

  let db: any;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Таблица для отслеживания миграций
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const results = db.exec('SELECT name FROM migrations');
  const appliedNames = new Set(
    results.length ? results[0].values.map((row: any) => row[0]) : []
  );

  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      db.run(migration.sql);
      db.run('INSERT INTO migrations (name) VALUES (?)', [migration.name]);
      console.log(`✅ Migration ${migration.name} applied`);
    } else {
      console.log(`⏭️  Migration ${migration.name} already applied`);
    }
  }

  // Сохраняем
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  db.close();
  console.log('✅ All migrations completed');
}

runMigrations();
