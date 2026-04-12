import { useState, useRef, useCallback, useEffect } from 'react';
import './Play.css';
import { giftApi } from '../services/api';
import { GiftImage } from '../components/GiftAnimation';

interface TelegramGift {
  id: string;
  name: string;
  description?: string;
  stars: number;
  animationSvg?: string;
  sticker?: any;
}

const BETS = [15, 25, 50];

// Дефолтные подарки (если API недоступен)
const DEFAULT_GIFTS: TelegramGift[] = [
  { id: '5170145012310081615', name: 'Подарок 1', stars: 15, animationSvg: '' },
  { id: '5170250947678437525', name: 'Подарок 2', stars: 25, animationSvg: '' },
  { id: '5168103777563050263', name: 'Подарок 3', stars: 25, animationSvg: '' },
];

function getRandomItems(gifts: TelegramGift[], count: number): (TelegramGift & { chance: string })[] {
  const shuffled = [...gifts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((gift) => ({
    ...gift,
    chance: (Math.random() * 2 + 0.3).toFixed(2),
  }));
}

export function Play() {
  const [bet, setBet] = useState(25);
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<TelegramGift[]>(DEFAULT_GIFTS);
  const [rouletteItems, setRouletteItems] = useState<(TelegramGift & { rouletteIndex: number })[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Загрузка подарков из API
  useEffect(() => {
    const loadGifts = async () => {
      try {
        setLoading(true);
        const response = await giftApi.getAll();
        if (response.success && response.data && response.data.length > 0) {
          setAvailableGifts(response.data);
        }
      } catch (error) {
        console.warn('Failed to load gifts from API, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    loadGifts();
  }, []);

  const generateRoulette = useCallback(() => {
    const items = Array.from({ length: 30 }, (_, i) => {
      const idx = i % availableGifts.length;
      const gift = availableGifts[idx];
      return { ...gift, rouletteIndex: i };
    });
    setRouletteItems(items);
    setPossibleGifts(getRandomItems(availableGifts, availableGifts.length));
  }, [availableGifts]);

  useEffect(() => {
    if (!loading) {
      generateRoulette();
    }
  }, [generateRoulette, loading]);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setOffset(0);

    setTimeout(() => {
      setSpinning(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="play">
        <div className="play__loading">Загрузка подарков...</div>
      </div>
    );
  }

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
          className={`play__roulette ${!spinning ? 'play__roulette--scrolling' : ''}`}
          ref={rouletteRef}
          style={!spinning ? undefined : { transform: `translateX(-${offset}px)` }}
        >
          {rouletteItems.map((item) => (
            <div key={item.rouletteIndex} className="play__roulette-item">
              <div className="play__roulette-emoji">
                {item.animationSvg ? (
                  <GiftImage svgContent={item.animationSvg} size={80} />
                ) : (
                  item.sticker?.emoji || '🎁'
                )}
              </div>
              <div className="play__roulette-cost-badge">
                {item.stars} ⭐
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
            <div className="play__gift-emoji">
              {gift.animationSvg ? (
                <GiftImage svgContent={gift.animationSvg} size={80} />
              ) : (
                gift.sticker?.emoji || '🎁'
              )}
            </div>
            <span className="play__gift-chance">{gift.chance}%</span>
            <span className="play__gift-cost">{gift.stars} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
