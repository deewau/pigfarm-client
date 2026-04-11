// Миграции для базы данных
// Запуск: npm run db:migrate

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const schemaPath = path.resolve(__dirname, './schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

const migrations = [
  {
    name: '001_initial_tables',
    sql: schema,
  },
];

async function runMigrations() {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const applied = await client.query('SELECT name FROM migrations');
    const appliedNames = new Set(applied.rows.map((r: any) => r.name));

    for (const migration of migrations) {
      if (!appliedNames.has(migration.name)) {
        console.log(`Applying migration: ${migration.name}`);
        await client.query(migration.sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration.name]);
        console.log(`✅ Migration ${migration.name} applied`);
      } else {
        console.log(`⏭️  Migration ${migration.name} already applied`);
      }
    }

    console.log('✅ All migrations completed');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
