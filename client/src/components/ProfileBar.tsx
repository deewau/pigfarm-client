import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { userApi } from '../services/api';
import './ProfileBar.css';

export function ProfileBar() {
  const { user } = useTelegram();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await userApi.getBalance();
        if (response.success) {
          setBalance(response.data.balance);
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, []);

  const avatarContent = user?.photo_url ? (
    <img src={user.photo_url} alt={user.first_name} />
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
          {user?.first_name || 'Пользователь'}
        </span>
        <span className="profile-bar__balance">
          <span className="profile-bar__balance-star">⭐</span>
          {loading ? '...' : balance.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
