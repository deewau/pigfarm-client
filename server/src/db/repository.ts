import { getDatabase } from './connection.js';
import type { User, Transaction } from '../types/index.js';

export const userRepository = {
  findById(id: number): User | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row as unknown as User;
    }
    return undefined;
  },

  findByTelegramId(telegramId: number): User | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    stmt.bind([telegramId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row as unknown as User;
    }
    return undefined;
  },

  create(data: {
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }): User {
    const db = getDatabase();
    db.run(
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.telegram_id,
        data.first_name,
        data.last_name || null,
        data.username || null,
        data.language_code || 'ru',
      ]
    );

    const result = db.exec('SELECT last_insert_rowid() as id');
    const newId = result[0].values[0][0] as number;
    return this.findById(newId)!;
  },

  updateBalance(userId: number, newBalance: number): User {
    const db = getDatabase();
    db.run('UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      newBalance,
      userId,
    ]);
    return this.findById(userId)!;
  },

  addBalance(userId: number, amount: number): User {
    const db = getDatabase();
    db.run(
      'UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount, userId]
    );
    return this.findById(userId)!;
  },
};

export const transactionRepository = {
  create(data: {
    user_id: number;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'spend';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    telegram_payment_charge_id?: string;
    description?: string;
  }): Transaction {
    const db = getDatabase();
    db.run(
      `INSERT INTO transactions (user_id, amount, type, status, telegram_payment_charge_id, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.amount,
        data.type,
        data.status,
        data.telegram_payment_charge_id || null,
        data.description || null,
      ]
    );

    const result = db.exec('SELECT last_insert_rowid() as id');
    const newId = result[0].values[0][0] as number;
    return this.findById(newId)!;
  },

  findById(id: number): Transaction | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row as unknown as Transaction;
    }
    return undefined;
  },

  findByTelegramChargeId(chargeId: string): Transaction | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM transactions WHERE telegram_payment_charge_id = ?');
    stmt.bind([chargeId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      return row as unknown as Transaction;
    }
    return undefined;
  },

  findByUserId(userId: number): Transaction[] {
    const db = getDatabase();
    const results = db.exec(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    if (!results.length || !results[0].values.length) {
      return [];
    }

    const columns = results[0].columns;
    return results[0].values.map((row) => {
      const obj: any = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj as Transaction;
    });
  },

  updateStatus(id: number, status: Transaction['status']): Transaction {
    const db = getDatabase();
    db.run('UPDATE transactions SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id)!;
  },
};
