import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

let pool: Pool | null = null;

function getPoolInstance(): Pool {
  if (!pool) {
    const databaseUrl = getDatabaseUrl();
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export function getPool() {
  return getPoolInstance();
}

export async function initializeDatabase(): Promise<void> {
  const client = await getPoolInstance().connect();
  try {
    const schemaPath = path.resolve(__dirname, './schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schema);
    console.log('✅ PostgreSQL schema applied');
  } finally {
    client.release();
  }
}
