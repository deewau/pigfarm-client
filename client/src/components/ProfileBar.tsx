import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { CircularAvatar } from './CircularAvatar';
import './ProfileBar.css';

export function ProfileBar() {
  const { user: tgUser } = useTelegram();
  const { user } = useAuth();

  return (
    <div className="profile-bar">
      <div className="profile-bar__avatar">
        <CircularAvatar 
          src={tgUser?.photo_url} 
          alt={tgUser?.first_name || 'User'} 
          progress={user?.xp ? 50 : 0} // TODO: calculate real progress
          size={44}
        />
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
