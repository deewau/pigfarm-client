import { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { CircularAvatar } from './CircularAvatar';
import { DepositModal } from './DepositModal';
import './AppHeader.css';

export function AppHeader() {
  const { user: tgUser } = useTelegram();
  const { user, userLevel } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);

  const displayName = user?.first_name || tgUser?.first_name || 'Пользователь';
  const balance = user?.balance ?? 0;
  const level = userLevel?.level ?? 1;

  return (
    <>
      <div className="app-header">
        {/* Левый блок - баланс */}
        <div className="app-header__balance-block">
          <span className="app-header__balance-value">{balance.toLocaleString()}</span>
          <span className="app-header__balance-icon">⭐</span>
          <button 
            className="app-header__deposit-btn"
            onClick={() => setDepositOpen(true)}
            title="Пополнить баланс"
          >
            +
          </button>
        </div>

        {/* Правый блок - профиль */}
        <div className="app-header__profile-block">
          <div className="app-header__user-info">
            <span className="app-header__name">{displayName}</span>
            <span className="app-header__level">Уровень {level}</span>
          </div>
          <CircularAvatar 
            src={tgUser?.photo_url} 
            alt={displayName}
            progress={userLevel?.progress || 0}
            size={40}
          />
        </div>
      </div>

      <DepositModal 
        isOpen={depositOpen} 
        onClose={() => setDepositOpen(false)} 
      />
    </>
  );
}
