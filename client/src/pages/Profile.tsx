import { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { GameIcon } from '../components/icons';
import { CircularAvatar } from '../components/CircularAvatar';
import { SettingsModal } from '../components/SettingsModal';
import { DepositModal } from '../components/DepositModal';
import { timeAgo } from '../utils/timeAgo';
import './Profile.css';

export function Profile() {
  const { user: tgUser } = useTelegram();
  const { user, loading, error, addBalance } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [tab, setTab] = useState<'gifts' | 'friends' | 'history'>('gifts');
  const level = 1;

  const handleInvite = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    const userId = user?.telegram_id || tgUser?.id;
    const referralLink = `https://t.me/piggitbot?startapp=ref_${userId}`;
    const message = `Присоединяйся к Pigfarm! 🐷\n\nПолучи бонус за регистрацию!`;
    
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
    tg.openTelegramLink(shareUrl);
  };

  const avatarUrl = tgUser?.photo_url || '';
  const displayName = user?.first_name || tgUser?.first_name || 'Пользователь';
  const balance = user?.balance || 0;

  // History data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  return (
    <div className="profile">
      {/* Карточка профиля */}
      <div className="profile__card">
        <div className="profile__header">
          <div className="profile__user-info">
            <div className="profile__avatar-wrapper">
              <CircularAvatar
                src={avatarUrl || undefined}
                alt={displayName}
                progress={0}
              />
              <span className="profile__level-badge">Ур. {level}</span>
            </div>
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
          <button
            className="profile__settings"
            aria-label="Настройки"
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
            </svg>
          </button>
        </div>
        <button className="profile__deposit" onClick={() => setDepositOpen(true)}>Пополнить баланс</button>
      </div>

      {/* Реферальный баннер */}
      <div className="profile__referral-banner" onClick={handleInvite}>
        <h3 className="profile__referral-title">Приглашай друзей</h3>
        <p className="profile__referral-subtitle">и зарабатывай 10% от их депозитов</p>
        <button className="profile__referral-btn">Пригласить друзей</button>
      </div>

      {/* Вкладки */}
      <div className="profile__tabs">
        <button
          className={`profile__tab ${tab === 'gifts' ? 'profile__tab--active' : ''}`}
          onClick={() => setTab('gifts')}
        >
          Подарки
        </button>
        <button
          className={`profile__tab ${tab === 'friends' ? 'profile__tab--active' : ''}`}
          onClick={() => setTab('friends')}
        >
          Друзья
        </button>
        <button
          className={`profile__tab ${tab === 'history' ? 'profile__tab--active' : ''}`}
          onClick={() => { setTab('history'); loadHistory(); }}
        >
          История
        </button>
      </div>

      {/* Содержимое вкладок */}
      {tab === 'gifts' && (
        <div className="profile__tab-content">
          <div className="profile__empty">
            <div className="profile__empty-icon">🔍</div>
            <p>У вас ещё нет подарков</p>
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="profile__tab-content">
          <div className="profile__empty">
            <div className="profile__empty-icon">👥</div>
            <p>У вас ещё нет друзей</p>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="profile__tab-content profile__tab-content--scrollable">
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
                    {tx.type === 'deposit' ? '💳' : tx.type === 'withdrawal' ? '📤' : '🎮'}
                  </div>
                  <div className="profile__history-info">
                    <span className="profile__history-title">
                      {tx.type === 'deposit' ? 'Пополнение баланса' : tx.type === 'withdrawal' ? 'Вывод средств' : 'Трата'}
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
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} onDepositSuccess={(amount) => { addBalance(amount); }} />
    </div>
  );
}
