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

const ITEM_WIDTH = 132;
const PATTERN_WIDTH = 396;

export function Play() {
  const [bet, setBet] = useState(25);
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<TelegramGift[]>(DEFAULT_GIFTS);
  const [rouletteItems, setRouletteItems] = useState<(TelegramGift & { rouletteIndex: number })[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const [showResult, setShowResult] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const animationRef = useRef<number | null>(null);
  const currentOffsetRef = useRef(0);
  const speedRef = useRef(8);
  const isPausedRef = useRef(false);

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

  useEffect(() => {
    if (loading || paused) return;

    const animate = () => {
      const rouletteEl = rouletteRef.current;
      if (!rouletteEl) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      currentOffsetRef.current += speedRef.current;
      rouletteEl.style.transform = `translateX(-${currentOffsetRef.current}px)`;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loading, paused]);

  const handleSpin = () => {
    if (spinning || rouletteItems.length === 0) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const winIndex = Math.floor(Math.random() * rouletteItems.length);
    const wonItem = rouletteItems[winIndex];

    const containerWidth = containerRef.current?.offsetWidth || 360;
    const centerOffset = containerWidth / 2 - 60;

    const baseOffset = Math.floor(currentOffsetRef.current / PATTERN_WIDTH) * PATTERN_WIDTH;
    const targetOffset = baseOffset + winIndex * ITEM_WIDTH - centerOffset;

    const distanceToTarget = targetOffset - currentOffsetRef.current;
    const minDistance = PATTERN_WIDTH * 3 + 100;
    const finalOffset = currentOffsetRef.current + Math.max(distanceToTarget, minDistance);

    setSpinning(true);
    speedRef.current = 8;
    isPausedRef.current = false;

    const startOffset = currentOffsetRef.current;
    const startTime = performance.now();
    const duration = 3000;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      currentOffsetRef.current = startOffset + (finalOffset - startOffset) * eased;

      const rouletteEl = rouletteRef.current;
      if (rouletteEl) {
        rouletteEl.style.transform = `translateX(-${currentOffsetRef.current}px)`;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setSpinning(false);

        if (demoMode) {
          setWonGift(wonItem);
          setPaused(true);
          setTimeout(() => setShowResult(true), 300);
        } else {
          setPaused(false);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const resetRoulette = () => {
    const rouletteEl = rouletteRef.current;
    if (rouletteEl) {
      currentOffsetRef.current = 0;
      rouletteEl.style.transform = 'translateX(0)';
    }
    setShowResult(false);
    setPaused(false);
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

      <div className="play__roulette-container" ref={containerRef}>
        <div className="play__roulette-pointer" />
        <div className="play__roulette" ref={rouletteRef}>
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

      {showResult && wonGift && (
        <ResultModal
          animationData={wonGift.animationData}
          onClose={resetRoulette}
          onDisableDemo={() => {
            resetRoulette();
            setDemoMode(false);
          }}
        />
      )}
    </div>
  );
}
