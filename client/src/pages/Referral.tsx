import { useState, useEffect } from 'react';
import { referralApi } from '../services/api';
import './Referral.css';

interface ReferralData {
  referralLink: string;
  telegramId: number;
  referralEarnings: number;
}

interface ReferralStats {
  totalReferrals: number;
  referralEarnings: number;
  referrals: Array<{
    id: number;
    first_name: string;
    username?: string;
    balance: number;
    created_at: string;
  }>;
}

export function Referral() {
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [refRes, statsRes] = await Promise.all([
        referralApi.getLink(),
        referralApi.getStats(),
      ]);

      if (refRes.success) setReferral(refRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!referral?.referralLink) return;
    try {
      await navigator.clipboard.writeText(referral.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInvite = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !referral) return;

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referral.referralLink)}&text=${encodeURIComponent(`Присоединяйся к Pigfarm! 🐷\n\nПолучи бонус за регистрацию по моей ссылке!`)}`;
    
    tg.openTelegramLink(shareUrl);
  };

  if (loading) {
    return (
      <div className="referral">
        <div className="referral__loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="referral">
      <div className="referral__card">
        <div className="referral__header">
          <h2 className="referral__title">Приглашай друзей</h2>
          <p className="referral__subtitle">и зарабатывай 10% от их депозитов</p>
        </div>

        <button className="referral__invite-btn" onClick={handleInvite}>
          Пригласить друзей
        </button>

        {referral && (
          <div className="referral__link-section">
            <label className="referral__label">Твоя реферальная ссылка:</label>
            <div className="referral__link-row">
              <input
                className="referral__link-input"
                value={referral.referralLink}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button className={`referral__copy-btn ${copied ? 'referral__copy-btn--copied' : ''}`} onClick={handleCopy}>
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>
        )}

        {stats && (
          <div className="referral__stats">
            <div className="referral__stat-row">
              <span className="referral__stat-label">Приглашено:</span>
              <span className="referral__stat-value">{stats.totalReferrals}</span>
            </div>
            <div className="referral__stat-row">
              <span className="referral__stat-label">Заработано:</span>
              <span className="referral__stat-value">{stats.referralEarnings} ⭐</span>
            </div>
          </div>
        )}

        {stats && stats.referrals.length > 0 && (
          <div className="referral__list">
            <h3 className="referral__list-title">Твои рефералы</h3>
            {stats.referrals.map((ref) => (
              <div key={ref.id} className="referral__item">
                <div className="referral__item-info">
                  <span className="referral__item-name">{ref.first_name}</span>
                  {ref.username && <span className="referral__item-username">@{ref.username}</span>}
                </div>
                <span className="referral__item-balance">{ref.balance} ⭐</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
