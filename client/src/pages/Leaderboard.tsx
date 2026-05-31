import { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useAuth } from '../hooks/useAuth';
import { leaderboardApi } from '../services/api';
import type { LeaderboardEntry } from '../types';
import './Leaderboard.css';

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#FFD700">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function formatVolume(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function Leaderboard() {
  const { user: tgUser } = useTelegram();
  const { user } = useAuth();
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<(LeaderboardEntry & { rank: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await leaderboardApi.get();
        if (res.success && res.data) {
          setTop(res.data.top || []);
          setCurrentUser(res.data.currentUser || null);
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function renderRow(entry: LeaderboardEntry) {
    const isFirst = entry.rank === 1;
    const isMe = user && entry.id === user.id;

    return (
      <div
        key={entry.id}
        className={`leaderboard__row ${isFirst ? 'leaderboard__row--first' : ''} ${isMe ? 'leaderboard__row--me' : ''}`}
      >
        <div className="leaderboard__rank">
          {isFirst ? (
            <div className="leaderboard__rank-crown">
              <CrownIcon />
            </div>
          ) : (
            <span className="leaderboard__rank-num">{entry.rank}</span>
          )}
        </div>

        <div className="leaderboard__avatar-wrapper">
          <div className={`leaderboard__avatar ${isFirst ? 'leaderboard__avatar--gold' : ''}`}>
            {tgUser?.photo_url && isMe ? (
              <img src={tgUser.photo_url} alt="" className="leaderboard__avatar-img" />
            ) : (
              <div className="leaderboard__avatar-placeholder">
                {entry.first_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {isFirst && <div className="leaderboard__crown-badge"><CrownIcon /></div>}
        </div>

        <div className="leaderboard__info">
          <span className="leaderboard__name">
            {entry.first_name} {entry.last_name || ''}
          </span>
          {entry.username && (
            <span className="leaderboard__username">@{entry.username}</span>
          )}
        </div>

        <div className="leaderboard__volume">
          <span className="leaderboard__volume-value">{formatVolume(entry.total_volume)}</span>
          <span className="leaderboard__volume-label">⭐</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="leaderboard">
        <div className="leaderboard__loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <h2 className="leaderboard__title">Таблица лидеров</h2>
        <p className="leaderboard__subtitle">Топ игроков по обороту звёзд</p>
      </div>

      <div className="leaderboard__list">
        {top.map(renderRow)}
      </div>

      {currentUser && currentUser.rank > 10 && (
        <div className="leaderboard__divider" />
      )}

      {currentUser && currentUser.rank > 10 && (
        <div className="leaderboard__my-position">
          <div className="leaderboard__my-label">Ваше место</div>
          {renderRow(currentUser)}
        </div>
      )}
    </div>
  );
}
