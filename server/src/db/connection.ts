import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../pigfarm.db');
const schemaPath = path.resolve(__dirname, './schema.sql');

const schema = fs.readFileSync(schemaPath, 'utf-8');

let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('🆕 New database created');
  }

  db.run(schema);
  saveDatabase();
  console.log('✅ Database initialized successfully');
}

process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit(0);
});
