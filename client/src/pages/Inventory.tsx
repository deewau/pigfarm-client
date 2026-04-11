import { useState, useEffect } from 'react';
import { timeAgo } from '../utils/timeAgo';
import './Inventory.css';

export function Inventory() {
  const [tab, setTab] = useState<'gifts' | 'friends' | 'history'>('gifts');

  return (
    <div className="inventory">
      <div className="inventory__tabs">
        <button
          className={`inventory__tab ${tab === 'gifts' ? 'inventory__tab--active' : ''}`}
          onClick={() => setTab('gifts')}
        >
          Подарки
        </button>
        <button
          className={`inventory__tab ${tab === 'friends' ? 'inventory__tab--active' : ''}`}
          onClick={() => setTab('friends')}
        >
          Друзья
        </button>
        <button
          className={`inventory__tab ${tab === 'history' ? 'inventory__tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          История
        </button>
      </div>

      {tab === 'gifts' && <GiftsTab />}
      {tab === 'friends' && <FriendsTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

function GiftsTab() {
  return (
    <div className="inventory__empty">
      <div className="inventory__empty-icon">🎁</div>
      <p className="inventory__empty-text">У вас ещё нет подарков</p>
    </div>
  );
}

function FriendsTab() {
  return (
    <div className="inventory__empty">
      <div className="inventory__empty-icon">👥</div>
      <p className="inventory__empty-text">У вас ещё нет друзей</p>
    </div>
  );
}

function HistoryTab() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const api = await import('../services/api');
      const response = await api.transactionApi.getHistory();
      if (response.success) setTransactions(response.data?.transactions || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="inventory__loading">Загрузка...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="inventory__empty">
        <div className="inventory__empty-icon">📋</div>
        <p className="inventory__empty-text">Нет транзакций</p>
      </div>
    );
  }

  return (
    <div className="inventory__list">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: any }) {
  const amountSign = transaction.type === 'deposit' ? '+' : transaction.type === 'withdrawal' ? '-' : '';
  const amountColor = transaction.type === 'deposit' ? '#34c759' : transaction.type === 'withdrawal' ? '#ff4444' : '#ffcc00';

  const typeLabels: Record<string, string> = {
    deposit: 'Пополнение баланса',
    withdrawal: 'Вывод средств',
    spend: 'Трата',
  };

  return (
    <div className="transaction-item">
      <div className="transaction-item__icon">
        {transaction.type === 'deposit' ? '💳' : transaction.type === 'withdrawal' ? '📤' : '🎮'}
      </div>
      <div className="transaction-item__info">
        <span className="transaction-item__title">{typeLabels[transaction.type] || transaction.type}</span>
        <span className="transaction-item__time">{timeAgo(transaction.created_at)}</span>
      </div>
      <span className="transaction-item__amount" style={{ color: amountColor }}>
        {amountSign}{transaction.amount} ⭐
      </span>
    </div>
  );
}
