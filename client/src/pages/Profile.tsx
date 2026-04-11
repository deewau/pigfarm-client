import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { GameIcon } from '../components/icons';
import { CircularAvatar } from '../components/CircularAvatar';
import { SettingsModal } from '../components/SettingsModal';
import { DepositModal } from '../components/DepositModal';
import './Profile.css';

export function Profile() {
  const navigate = useNavigate();
  const { user: tgUser } = useTelegram();
  const { user, loading, error, addBalance } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
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

  const handleInventory = () => {
    navigate('/inventory');
  };

  const avatarUrl = tgUser?.photo_url || '';
  const displayName = user?.first_name || tgUser?.first_name || 'Пользователь';
  const balance = user?.balance || 0;

  return (
    <div className="profile">
      <div className="profile__card">
        {/* Кнопки действий */}
        <div className="profile__actions">
          <button className="profile__action-btn profile__action-btn--secondary" onClick={handleInventory}>
            <span className="profile__action-icon">🎁</span>
            Инвентарь
          </button>
          <button className="profile__action-btn profile__action-btn--primary" onClick={handleInvite}>
            Приглашай друзей
            <span className="profile__action-arrow">→</span>
          </button>
        </div>

        <div className="profile__header">
          <div className="profile__user-info">
            <div className="profile__avatar-wrapper">
              <CircularAvatar
                src={avatarUrl || undefined}
                alt={displayName}
                progress={0}
              />
              <span className="profile__level">Ур. {level}</span>
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

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} onDepositSuccess={(amount) => { addBalance(amount); }} />
    </div>
  );
}
