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

const DEFAULT_GIFTS: TelegramGift[] = [
  { id: '5170145012310081615', name: 'Сердце', stars: 15, animationSvg: '' },
  { id: '5170233102089322756', name: 'Мишка', stars: 15, animationSvg: '' },
  { id: '5170250947678437525', name: 'Подарок', stars: 25, animationSvg: '' },
  { id: '5168103777563050263', name: 'Роза', stars: 25, animationSvg: '' },
  { id: '5170144170496491616', name: 'Торт', stars: 50, animationSvg: '' },
  { id: '5170314324215857265', name: 'Букет', stars: 50, animationSvg: '' },
  { id: '5170564780938756245', name: 'Ракета', stars: 50, animationSvg: '' },
  { id: '6028601630662853006', name: 'Шампанское', stars: 50, animationSvg: '' },
  { id: '5168043875654172773', name: 'Кубок', stars: 100, animationSvg: '' },
  { id: '5170690322832818290', name: 'Кольцо', stars: 100, animationSvg: '' },
  { id: '5170521118301225164', name: 'Алмаз', stars: 100, animationSvg: '' },
];

function getRandomItems(gifts: TelegramGift[], count: number): (TelegramGift & { chance: string })[] {
  const shuffled = [...gifts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((gift) => ({
    ...gift,
    chance: (Math.random() * 2 + 0.3).toFixed(2),
  }));
}

const ITEM_WIDTH = 132;
const GIFTS_COUNT = 11;
const PATTERN_WIDTH = ITEM_WIDTH * GIFTS_COUNT;
const SCROLL_SPEED = 1;
const SPIN_DISTANCE = PATTERN_WIDTH * 4;

export function Play() {
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<TelegramGift[]>(DEFAULT_GIFTS);
  const [rouletteItems, setRouletteItems] = useState<(TelegramGift & { rouletteIndex: number })[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);

  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const currentOffsetRef = useRef(0);
  const isScrollingRef = useRef(true);

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

  const startScrolling = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const animate = () => {
      const rouletteEl = rouletteRef.current;
      if (!rouletteEl) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      currentOffsetRef.current += SCROLL_SPEED;

      if (currentOffsetRef.current >= PATTERN_WIDTH) {
        currentOffsetRef.current -= PATTERN_WIDTH;
      }

      rouletteEl.style.transform = `translateX(-${currentOffsetRef.current}px)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!loading && rouletteItems.length > 0) {
      startScrolling();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loading, rouletteItems.length]);

  const handleSpin = () => {
    if (spinning || rouletteItems.length === 0) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const winIndex = Math.floor(Math.random() * rouletteItems.length);
    const wonItem = rouletteItems[winIndex];

    const containerWidth = containerRef.current?.offsetWidth || 360;
    const centerOffset = containerWidth / 2 - 60;

    const currentInPattern = currentOffsetRef.current;
    const targetInPattern = winIndex * ITEM_WIDTH - centerOffset;

    let distance = targetInPattern - currentInPattern;

    if (distance <= 0) {
      distance += SPIN_DISTANCE;
    }

    distance = distance + SPIN_DISTANCE;

    const startOffset = currentOffsetRef.current;
    const startTime = performance.now();
    const duration = 3000;

    setSpinning(true);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      const newOffset = startOffset + distance * eased;
      const loopedOffset = newOffset % PATTERN_WIDTH;

      currentOffsetRef.current = loopedOffset;

      const rouletteEl = rouletteRef.current;
      if (rouletteEl) {
        rouletteEl.style.transform = `translateX(-${loopedOffset}px)`;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setSpinning(false);

        if (demoMode) {
          setWonGift(wonItem);
          setShowResult(true);
        } else {
          startScrolling();
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const closeModal = () => {
    setShowResult(false);
    startScrolling();
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
      <div className="play__roulette-container" ref={containerRef}>
        <div className="play__roulette-pointer" />
        <div className="play__roulette" ref={rouletteRef}>
          {rouletteItems.map((item) => (
            <div key={item.rouletteIndex} className="play__roulette-item">
              <div className="play__roulette-emoji">
                {item.animationSvg ? (
                  <GiftImage svgContent={item.animationSvg} size={60} uniqueId={`roulette-${item.rouletteIndex}`} />
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

      <div className="play__controls">
        <button
          className={`play__play-btn ${spinning ? 'play__play-btn--spinning' : ''}`}
          onClick={handleSpin}
          disabled={spinning}
        >
          {spinning ? '🎰 Крутится...' : '🎲 Крутить!'}
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

      <p className="play__subtitle">Вы можете выиграть...</p>
      <div className="play__gifts-grid">
        {possibleGifts.map((gift, i) => (
          <div key={i} className="play__gift-card">
            <div className="play__gift-emoji">
              {gift.animationSvg ? (
                <GiftImage svgContent={gift.animationSvg} size={80} uniqueId={`gift-${i}`} />
              ) : (
                gift.sticker?.emoji || '🎁'
              )}
            </div>
            <span className="play__gift-chance">{gift.chance}%</span>
            <span className="play__gift-cost">{gift.stars} ⭐</span>
          </div>
        ))}
      </div>

      {showResult && wonGift && (
        <ResultModal
          animationData={wonGift.animationData}
          onClose={closeModal}
          onDisableDemo={() => {
            setShowResult(false);
            setDemoMode(false);
            startScrolling();
          }}
        />
      )}
    </div>
  );
}
