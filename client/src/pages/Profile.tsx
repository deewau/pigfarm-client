import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { GameIcon } from '../components/icons';
import { CircularAvatar } from '../components/CircularAvatar';
import { DepositModal } from '../components/DepositModal';
import { timeAgo } from '../utils/timeAgo';
import { userApi } from '../services/api';
import './Profile.css';

export function Profile() {
  const { user: tgUser } = useTelegram();
  const { user, loading, error, addBalance } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);
  const [tab, setTab] = useState<'history'>('history');

  const [levelData, setLevelData] = useState<{ level: number; currentXp: number; xpForNextLevel: number; progress: number } | null>(null);

  const avatarUrl = tgUser?.photo_url || '';
  const displayName = user?.first_name || tgUser?.first_name || 'Пользователь';
  const balance = user?.balance || 0;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    async function loadXp() {
      try {
        const res = await userApi.getXp();
        if (res.success && res.data) {
          setLevelData(res.data.level);
        }
      } catch (e) {
        console.error('Failed to load XP:', e);
      }
    }
    loadXp();
  }, []);

  const loadHistory = async () => {
    if (transactions.length > 0) return;
    setHistoryLoading(true);
    try {
      const api = await import('../services/api');
      const response = await api.transactionApi.getHistory();
      if (response.success) setTransactions(response.data?.transactions || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    }
  }, [tab]);

  return (
    <div className="profile">
      <div className="profile__card">
        <div className="profile__header">
          <div className="profile__user-info">
            <CircularAvatar
              src={avatarUrl || undefined}
              alt={displayName}
              progress={0}
            />
            <div className="profile__details">
              <span className="profile__name">{displayName}</span>
              {loading ? (
                <span className="profile__balance-value">Загрузка...</span>
              ) : error ? (
                <span className="profile__balance-value" style={{ color: '#ff4444' }}>Ошибка</span>
              ) : (
                <div className="profile__balance">
                  <span className="profile__balance-value">{balance}</span>
                  <span className="profile__balance-icon">
                    <GameIcon />
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile__level-bar">
          <div className="profile__level-header">
            <span className="profile__level-label">Уровень {levelData?.level || 1}</span>
            <span className="profile__level-xp">{levelData?.currentXp || 0} / {levelData?.xpForNextLevel || 1000} XP</span>
          </div>
          <div className="profile__progress-track">
            <div
              className="profile__progress-fill"
              style={{ width: `${levelData?.progress || 0}%` }}
            />
            <div className="profile__progress-glow" style={{ width: `${levelData?.progress || 0}%` }} />
          </div>
        </div>

        <button className="profile__deposit" onClick={() => setDepositOpen(true)}>Пополнить баланс</button>
      </div>

      <div className="profile__tabs">
        <button
          className={`profile__tab ${tab === 'history' ? 'profile__tab--active' : ''}`}
          onClick={() => { setTab('history'); loadHistory(); }}
        >
          История
        </button>
      </div>

      {tab === 'history' && (
        <div className="profile__tab-content profile__tab-content--scrollable">
          <div className="profile__history-scroll">
          {historyLoading ? (
            <div className="profile__loading">Загрузка...</div>
          ) : transactions.length === 0 ? (
            <div className="profile__empty">
              <div className="profile__empty-icon">📋</div>
              <p>Нет транзакций</p>
            </div>
          ) : (
            <div className="profile__history-list">
              {transactions.map((tx) => (
                <div key={tx.id} className="profile__history-item">
                  <div className="profile__history-icon">
                    {tx.type === 'deposit' ? '💳' : tx.type === 'withdrawal' ? (tx.description?.includes('Отправлен подарок') ? '🎁' : '📤') : '🎮'}
                  </div>
                  <div className="profile__history-info">
                    <span className="profile__history-title">
                      {tx.type === 'deposit' ? 'Пополнение баланса' : tx.type === 'withdrawal' ? (tx.description?.includes('Отправлен подарок') ? 'Отправка подарка' : 'Вывод средств') : 'Трата'}
                    </span>
                    <span className="profile__history-time">{timeAgo(tx.created_at)}</span>
                  </div>
                  <span className={`profile__history-amount ${tx.type === 'deposit' ? 'profile__history-amount--positive' : 'profile__history-amount--negative'}`}>
                    {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}{tx.amount} ⭐
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} onDepositSuccess={(amount) => { addBalance(amount); }} />
    </div>
  );
}