import { useState } from 'react';
import './LiveBets.css';

export interface LiveBetInfo {
  userId: number;
  firstName: string;
  amount: number;
  cashOutAt: number | null;
  photoUrl?: string | null;
}

interface LiveBetsProps {
  bets: LiveBetInfo[];
  gameState: string;
  currentMultiplier: number;
}

const PRIZE_ICONS = ['🎁', '🍀', '🎯', '💎', '🔥', '👑', '🏆', '💫', '🌟', '♠️', '🎰', '💎'];

function getPrizeIcon(userId: number): string {
  return PRIZE_ICONS[Math.abs(userId) % PRIZE_ICONS.length];
}

function getInitials(name: string): string {
  return name.charAt(0).toUpperCase();
}

function truncateName(name: string, maxLen: number = 15): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '...' : name;
}

export function LiveBets({ bets, gameState, currentMultiplier }: LiveBetsProps) {
  const [expanded, setExpanded] = useState(false);

  const displayBets = expanded ? bets : bets.slice(0, 5);
  const hiddenCount = bets.length - 5;

  const isLost = gameState === 'crashed' || gameState === 'pause';

  const isCashedOut = (bet: LiveBetInfo): boolean =>
    bet.cashOutAt != null && typeof bet.cashOutAt === 'number';

  const getMultiplierColor = (bet: LiveBetInfo): string => {
    if (isCashedOut(bet)) return '#4CAF50';
    if (isLost) return '#FF0000';
    return '#888';
  };

  const getMultiplierText = (bet: LiveBetInfo): string => {
    if (isCashedOut(bet)) return `x${bet.cashOutAt!.toFixed(2)}`;
    return `x${currentMultiplier.toFixed(2)}`;
  };

  if (bets.length === 0) return null;

  return (
    <div className="live-bets">
      <div className="live-bets__header">
        <span className="live-bets__header-left">Игрок / Сумма</span>
        <span className="live-bets__header-right">Множитель</span>
      </div>

      <div className="live-bets__body">
        {displayBets.map((bet, idx) => (
          <div
            key={bet.userId}
            className="live-bets__item"
            style={{ animationDelay: `${idx * 0.04}s` }}
          >
            <div className="live-bets__item-left">
              {bet.photoUrl ? (
                <img className="live-bets__avatar" src={bet.photoUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="live-bets__avatar live-bets__avatar--default">
                  {getInitials(bet.firstName)}
                </div>
              )}
              <div className="live-bets__player-info">
                <span className="live-bets__name">{truncateName(bet.firstName)}</span>
                <span className="live-bets__amount">{bet.amount} ⭐</span>
              </div>
            </div>

            <div className="live-bets__item-right">
              <div className="live-bets__multiplier-wrap">
                <span
                  className="live-bets__multiplier"
                  style={{ color: getMultiplierColor(bet) }}
                >
                  {getMultiplierText(bet)}
                </span>
                {bet.cashOutAt !== null && (
                  <span className="live-bets__checkmark">✓</span>
                )}
              </div>
              <span className="live-bets__prize-icon">{getPrizeIcon(bet.userId)}</span>
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && !expanded && (
        <div className="live-bets__footer" onClick={() => setExpanded(true)}>
          И ещё ставок: {hiddenCount}
        </div>
      )}

      {hiddenCount > 0 && expanded && (
        <div className="live-bets__footer" onClick={() => setExpanded(false)}>
          Свернуть
        </div>
      )}
    </div>
  );
}
