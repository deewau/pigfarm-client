import { useState, useRef, useCallback, useEffect } from 'react';
import './Play.css';
import { giftApi, winApi, userApi } from '../services/api';
import { GiftImage } from '../components/GiftAnimation';
import { ResultModal } from '../components/ResultModal';
import { ProfileBar } from '../components/ProfileBar';
import { DepositModal } from '../components/DepositModal';
import { useAuth } from '../hooks/useAuth';

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

const GIFT_PROBABILITIES: Record<string, number> = {
  '5170145012310081615': 18.72,
  '5170233102089322756': 18.72,
  '5170250947678437525': 30.63,
  '5168103777563050263': 30.05,
  '5170144170496491616': 0.406,
  '5170314324215857265': 0.506,
  '5170564780938756245': 0.506,
  '6028601630662853006': 0.506,
  '5168043875654172773': 0.715,
  '5170690322832818290': 0.812,
  '5170521118301225164': 0.812,
};

const SPIN_COST = 25;

function weightedRandomSelect<T extends { id: string }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + (GIFT_PROBABILITIES[item.id] || 0), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    const weight = GIFT_PROBABILITIES[item.id] || 0;
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

function generateWeightedRoulette(gifts: TelegramGift[], totalItems: number): (TelegramGift & { rouletteIndex: number })[] {
  const result: (TelegramGift & { rouletteIndex: number })[] = [];
  
  // Гарантируем, что все подарки есть в рулетке хотя бы раз
  gifts.forEach((gift, index) => {
    result.push({ ...gift, rouletteIndex: index });
  });
  
  // Добавляем оставшиеся слоты со случайным выбором
  for (let i = gifts.length; i < totalItems; i++) {
    const gift = weightedRandomSelect(gifts);
    result.push({ ...gift, rouletteIndex: i });
  }
  
  // Перемешиваем для красоты
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  // Пересчитываем индексы
  result.forEach((item, index) => {
    item.rouletteIndex = index;
  });
  
  return result;
}

function getPossibleGifts(gifts: TelegramGift[]): (TelegramGift & { chance: number })[] {
  return gifts.map((gift) => ({
    ...gift,
    chance: GIFT_PROBABILITIES[gift.id] || 0,
  }));
}

const ITEM_WIDTH = 97;
const ROULETTE_SIZE = 30;
const PATTERN_WIDTH = ITEM_WIDTH * ROULETTE_SIZE;
const SCROLL_SPEED = 1;

export function Play() {
  const { user, addBalance, refreshBalance } = useAuth();
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<TelegramGift[]>(DEFAULT_GIFTS);
  const [rouletteItems, setRouletteItems] = useState<(TelegramGift & { rouletteIndex: number })[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);
  const [autoSpinAfterDeposit, setAutoSpinAfterDeposit] = useState(false);

  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const currentOffsetRef = useRef(0);
  const spinCancelledRef = useRef(false);

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

  useEffect(() => {
    if (!loading && availableGifts.length > 0 && rouletteItems.length === 0) {
      const items = generateWeightedRoulette(availableGifts, 30);
      setRouletteItems(items);
      setPossibleGifts(getPossibleGifts(availableGifts));
    }
  }, [loading, availableGifts.length, rouletteItems.length]);

  useEffect(() => {
    if (autoSpinAfterDeposit && user && user.balance >= SPIN_COST && !spinning) {
      setAutoSpinAfterDeposit(false);
      handleSpin();
    }
  }, [autoSpinAfterDeposit, user, spinning]);

  useEffect(() => {
    if (!showResult && !spinning && !loading && rouletteItems.length > 0) {
      startScrolling();
    }
  }, [showResult, spinning, loading, rouletteItems.length]);

  const startScrolling = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const SINGLE_PATTERN_WIDTH = ITEM_WIDTH * ROULETTE_SIZE;

    const animate = () => {
      const rouletteEl = rouletteRef.current;
      if (!rouletteEl) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      currentOffsetRef.current += SCROLL_SPEED;

      if (currentOffsetRef.current >= SINGLE_PATTERN_WIDTH) {
        currentOffsetRef.current -= SINGLE_PATTERN_WIDTH;
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

  const handleSpin = async () => {
    if (spinning || rouletteItems.length === 0) return;

    // Проверяем баланс если не демо-режим
    if (!demoMode && user) {
      if (user.balance < SPIN_COST) {
        setShowDeposit(true);
        return;
      }

      // Списываем звёзды
      try {
        const response = await userApi.spend(SPIN_COST, 'Крутка рулетки');
        if (response.success) {
          refreshBalance();
        } else {
          console.error('Failed to spend:', response.error);
          return;
        }
      } catch (err) {
        console.error('Failed to spend balance:', err);
        return;
      }
    }

    spinCancelledRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const wonItem = weightedRandomSelect(availableGifts);
    
    const containerWidth = containerRef.current?.offsetWidth || 360;
    const centerOffset = containerWidth / 2 - ITEM_WIDTH / 2;
    
    const currentPos = currentOffsetRef.current;
    
    const wonIndices: number[] = [];
    for (let i = 0; i < rouletteItems.length; i++) {
      if (rouletteItems[i].id === wonItem.id) {
        wonIndices.push(i);
      }
    }
    
    let targetIndex = wonIndices[Math.floor(Math.random() * wonIndices.length)];
    
    const currentIndexInPattern = Math.floor((currentPos + centerOffset) / ITEM_WIDTH) % ROULETTE_SIZE;
    const offsetToTarget = (targetIndex - currentIndexInPattern + ROULETTE_SIZE) % ROULETTE_SIZE;
    
    if (offsetToTarget === 0) {
      targetIndex = (targetIndex + 1) % ROULETTE_SIZE;
    }
    
    const targetPos = targetIndex * ITEM_WIDTH;
    
    let distance = targetPos - currentPos;
    if (distance <= 0) {
      distance += PATTERN_WIDTH;
    }
    distance += PATTERN_WIDTH * 2;

    const startOffset = currentOffsetRef.current;
    const startTime = performance.now();
    const duration = 3000;

    setSpinning(true);

    const animate = (timestamp: number) => {
      if (spinCancelledRef.current) {
        setSpinning(false);
        startScrolling();
        return;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);

      const newOffset = startOffset + distance * eased;
      const loopedOffset = ((newOffset % PATTERN_WIDTH) + PATTERN_WIDTH) % PATTERN_WIDTH;

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

        const centerIndex = Math.floor((loopedOffset + centerOffset) / ITEM_WIDTH) % rouletteItems.length;
        const actualWonGift = rouletteItems[centerIndex];

        if (demoMode) {
          setWonGift(actualWonGift);
          setShowResult(true);
        } else {
          winApi.claim({
            id: actualWonGift.id,
            name: actualWonGift.name,
            stars: actualWonGift.stars,
          }).then(() => {
            setWonGift(actualWonGift);
            setShowResult(true);
          }).catch((err) => {
            console.error('Failed to claim gift:', err);
            startScrolling();
          });
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const closeModal = () => {
    setShowResult(false);
    startScrolling();
  };

  const handleGoToProfile = () => {
    setShowResult(false);
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) {
      tg.BackButton.show();
    }
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
      <ProfileBar />
      <div className="play__roulette-container" ref={containerRef}>
        <div className="play__roulette-pointer" />
        <div className="play__roulette" ref={rouletteRef}>
          {[...rouletteItems, ...rouletteItems].map((item, index) => (
            <div key={`${item.rouletteIndex}-${index}`} className="play__roulette-item">
              <div className="play__roulette-emoji">
                {item.animationSvg ? (
                  <GiftImage svgContent={item.animationSvg} size={70} uniqueId={`roulette-${item.rouletteIndex}-${index}`} />
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
          {spinning ? '🎰 Крутится...' : demoMode ? '🎲 Крутить!' : `🎲 Крутить! ${SPIN_COST} ⭐`}
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
            <span className="play__gift-chance">{gift.chance.toFixed(3)}%</span>
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
          isDemo={demoMode}
          onGoToProfile={handleGoToProfile}
        />
      )}

      {showDeposit && (
        <DepositModal
          isOpen={showDeposit}
          onClose={() => {
            spinCancelledRef.current = true;
            setShowDeposit(false);
          }}
          onDepositSuccess={(amount) => {
            addBalance(amount);
            refreshBalance();
            setShowDeposit(false);
            setAutoSpinAfterDeposit(true);
          }}
        />
      )}
    </div>
  );
}
