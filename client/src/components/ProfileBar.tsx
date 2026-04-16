import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import './ProfileBar.css';

export function ProfileBar() {
  const { user: tgUser } = useTelegram();
  const { user } = useAuth();

  const avatarContent = tgUser?.photo_url ? (
    <img src={tgUser.photo_url} alt={tgUser.first_name} />
  ) : (
    <span>👤</span>
  );

  return (
    <div className="profile-bar">
      <div className="profile-bar__avatar">
        {avatarContent}
      </div>
      <div className="profile-bar__info">
        <span className="profile-bar__name">
          {user?.first_name || tgUser?.first_name || 'Пользователь'}
        </span>
        <span className="profile-bar__balance">
          <span className="profile-bar__balance-star">⭐</span>
          {user?.balance !== undefined ? user.balance.toLocaleString() : '...'}
        </span>
      </div>
    </div>
  );
}
