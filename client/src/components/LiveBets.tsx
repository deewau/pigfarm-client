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
    if (isLost) return '#FF453A';
    return 'rgba(255,255,255,0.5)';
  };

  const getMultiplierText = (bet: LiveBetInfo): string => {
    if (isCashedOut(bet)) return `x${bet.cashOutAt!.toFixed(2)}`;
    return `x${currentMultiplier.toFixed(2)}`;
  };

  if (bets.length === 0) return null;

  return (
    <div className="lb">
      <div className="lb__header">
        <span className="lb__header-label">Игроки</span>
        <span className="lb__header-count">{bets.length}</span>
      </div>

      <div className="lb__body">
        {displayBets.map((bet, idx) => (
          <div
            key={bet.userId}
            className="lb__row"
            style={{ animationDelay: `${idx * 0.04}s` }}
          >
            <div className="lb__row-left">
              <div className="lb__avatar-wrap">
                {bet.photoUrl ? (
                  <img className="lb__avatar" src={bet.photoUrl} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="lb__avatar lb__avatar--default">
                    {getInitials(bet.firstName)}
                  </div>
                )}
                <span className="lb__online" />
              </div>
              <div className="lb__player">
                <span className="lb__name">{truncateName(bet.firstName)}</span>
                <span className="lb__bet">{bet.amount} <span className="lb__bet-unit">⭐</span></span>
              </div>
            </div>

            <div className="lb__row-right">
              <span
                className="lb__multiplier"
                style={{ color: getMultiplierColor(bet) }}
              >
                {getMultiplierText(bet)}
              </span>
              {bet.cashOutAt !== null && (
                <span className="lb__check">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && !expanded && (
        <div className="lb__footer" onClick={() => setExpanded(true)}>
          Ещё {hiddenCount} {hiddenCount === 1 ? 'ставка' : hiddenCount < 5 ? 'ставки' : 'ставок'}
        </div>
      )}

      {hiddenCount > 0 && expanded && (
        <div className="lb__footer" onClick={() => setExpanded(false)}>
          Свернуть
        </div>
      )}
    </div>
  );
}
