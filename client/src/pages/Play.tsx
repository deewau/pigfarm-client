import { useState, useRef, useCallback, useEffect } from 'react';
import './Play.css';

const BETS = [15, 25, 50];

// 3 типа подарков из Telegram
const ALL_GIFTS = [
  { emoji: '💝', name: 'Сердце с бантом', cost: 15 },
  { emoji: '🎁', name: 'Подарок', cost: 25 },
  { emoji: '🌹', name: 'Роза', cost: 25 },
];

function getRandomItems(count: number): any[] {
  const shuffled = [...ALL_GIFTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((gift) => ({
    ...gift,
    chance: (Math.random() * 2 + 0.3).toFixed(2),
  }));
}

const INITIAL_ITEMS = Array.from({ length: 30 }, (_, i) => {
  const idx = i % 3;
  const gift = ALL_GIFTS[idx];
  return { ...gift, id: i };
});

export function Play() {
  const [bet, setBet] = useState(25);
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState<any[]>(INITIAL_ITEMS);
  const [possibleGifts, setPossibleGifts] = useState<any[]>(() => {
    const shuffled = [...ALL_GIFTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((gift) => ({
      ...gift,
      chance: (Math.random() * 2 + 0.3).toFixed(2),
    }));
  });
  const rouletteRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const generateRoulette = useCallback(() => {
    const items = Array.from({ length: 30 }, (_, i) => {
      const idx = i % 3;
      const gift = ALL_GIFTS[idx];
      return { ...gift, id: i };
    });
    setRouletteItems(items);
    setPossibleGifts(getRandomItems(3));
  }, []);

  useEffect(() => {
    generateRoulette();
  }, [generateRoulette]);

  // Плавная анимация движения рулетки
  useEffect(() => {
    if (spinning) return;
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 0.5) % 160);
    }, 50);
    return () => clearInterval(interval);
  }, [spinning]);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setOffset(0);

    setTimeout(() => {
      setSpinning(false);
    }, 3000);
  };

  return (
    <div className="play">
      {/* Выбор ставки */}
      <div className="play__bets">
        {BETS.map((b) => (
          <button
            key={b}
            className={`play__bet-btn ${bet === b ? 'play__bet-btn--active' : ''}`}
            onClick={() => setBet(b)}
          >
            {b}
            <span className="play__bet-icon">⭐</span>
          </button>
        ))}
      </div>

      {/* Рулетка */}
      <div className="play__roulette-container">
        <div className="play__roulette-pointer" />
        <div
          className="play__roulette"
          ref={rouletteRef}
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {rouletteItems.map((item, i) => (
            <div key={i} className="play__roulette-item">
              <div className="play__roulette-emoji">{item.emoji}</div>
              <div className="play__roulette-cost-badge">
                {item.cost}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка игры и демо */}
      <div className="play__controls">
        <button
          className={`play__play-btn ${spinning ? 'play__play-btn--spinning' : ''}`}
          onClick={handleSpin}
          disabled={spinning}
        >
          {spinning ? '🎰 Крутится...' : `Мне повезёт, Go! ${bet} ⭐`}
        </button>
        <div className="play__demo">
          <span className="play__demo-label">DEMO</span>
          <label className="play__demo-toggle">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={() => setDemoMode(!demoMode)}
            />
            <span className="play__demo-slider" />
          </label>
        </div>
      </div>

      {/* Возможные призы */}
      <p className="play__subtitle">Вы можете выиграть...</p>
      <div className="play__gifts-grid">
        {possibleGifts.map((gift, i) => (
          <div key={i} className="play__gift-card">
            <div className="play__gift-emoji">{gift.emoji}</div>
            <span className="play__gift-chance">{gift.chance}%</span>
            <span className="play__gift-cost">{gift.cost} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
