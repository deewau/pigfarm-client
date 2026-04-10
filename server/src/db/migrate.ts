// Миграции для базы данных
// Запуск: npm run db:migrate

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../pigfarm.db');
const schemaPath = path.resolve(__dirname, './schema.sql');

const schema = fs.readFileSync(schemaPath, 'utf-8');

const migrations = [
  {
    name: '001_initial_tables',
    sql: schema,
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

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  db.close();
  console.log('✅ All migrations completed');
}

runMigrations();
