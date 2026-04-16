import { useState, useRef, useCallback, useEffect } from 'react';
import './Play.css';
import { giftApi } from '../services/api';
import { GiftImage } from '../components/GiftAnimation';
import { ResultModal } from '../components/ResultModal';

interface TelegramGift {
  id: string;
  name: string;
  description?: string;
  stars: number;
  animationSvg?: string;
  animationData?: any;
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
  const [showResult, setShowResult] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollingPaused, setScrollingPaused] = useState(false);
  const animationDelayRef = useRef<string>('0s');

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
    if (spinning || rouletteItems.length === 0) return;

    const rouletteEl = rouletteRef.current;
    if (!rouletteEl) return;

    // Определяем случайный подарок
    const winIndex = Math.floor(Math.random() * rouletteItems.length);
    const wonItem = rouletteItems[winIndex];

    const itemWidth = 132;
    const containerWidth = containerRef.current?.offsetWidth || 360;
    const centerOffset = containerWidth / 2 - 60;
    const targetOffset = winIndex * itemWidth - centerOffset;

    // Получаем текущую позицию из CSS-анимации
    const computedStyle = getComputedStyle(rouletteEl);
    const matrix = computedStyle.transform;
    let currentX = 0;
    if (matrix && matrix !== 'none') {
      const values = matrix.split('(')[1].split(')')[0].split(',');
      currentX = parseFloat(values[4]) || 0;
    }

    // Вычисляем дополнительное расстояние для анимации
    const additionalDistance = targetOffset - currentX;

    setSpinning(true);

    requestAnimationFrame(() => {
      if (rouletteEl) {
        rouletteEl.style.transition = 'transform 3s cubic-bezier(0.2, 0, 0.4, 1)';
        rouletteEl.style.transform = `translateX(${currentX - additionalDistance}px)`;
      }
    });

    // После завершения анимации (ровно 3 секунды)
    setTimeout(() => {
      setSpinning(false);

      const patternWidth = 396;
      const finalX = currentX - additionalDistance;
      const normalizedOffset = ((finalX % patternWidth) + patternWidth) % patternWidth;
      const delaySeconds = -(normalizedOffset / patternWidth) * 12;
      animationDelayRef.current = `${delaySeconds}s`;

      if (demoMode) {
        setWonGift(wonItem);
        setScrollingPaused(true);
        setTimeout(() => setShowResult(true), 300);
      } else {
        const rouletteEl = rouletteRef.current;
        if (rouletteEl) {
          rouletteEl.style.transform = '';
          rouletteEl.style.transition = '';
        }
      }
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
      <div className="play__roulette-container" ref={containerRef}>
        <div className="play__roulette-pointer" />
        <div
          className={`play__roulette ${!spinning ? (scrollingPaused ? 'play__roulette--paused' : 'play__roulette--scrolling') : ''}`}
          ref={rouletteRef}
          style={!spinning && animationDelayRef.current !== '0s' ? { animationDelay: animationDelayRef.current } : undefined}
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

      {/* Модальное окно результата */}
      {showResult && wonGift && (
        <ResultModal
          animationData={wonGift.animationData}
          onClose={() => {
            // Применяем рассчитанную задержку и снимаем inline стили
            const rouletteEl = rouletteRef.current;
            if (rouletteEl) {
              rouletteEl.style.transform = '';
              rouletteEl.style.transition = '';
            }
            setShowResult(false);
            setScrollingPaused(false);
          }}
          onDisableDemo={() => {
            const rouletteEl = rouletteRef.current;
            if (rouletteEl) {
              rouletteEl.style.transform = '';
              rouletteEl.style.transition = '';
            }
            setShowResult(false);
            setScrollingPaused(false);
            setDemoMode(false);
          }}
        />
      )}
    </div>
  );
}
