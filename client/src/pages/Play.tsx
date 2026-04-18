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
const ITEM_WIDTH = 97;
const PATTERN_SIZE = 30;
const TOTAL_ITEMS = PATTERN_SIZE * 3; // 90 элементов (3 копии)
const TOTAL_WIDTH = TOTAL_ITEMS * ITEM_WIDTH;
const SCROLL_SPEED = 0.15;

function weightedRandomSelect(gifts: TelegramGift[]): TelegramGift {
  const totalWeight = gifts.reduce((sum, item) => sum + (GIFT_PROBABILITIES[item.id] || 0), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of gifts) {
    const weight = GIFT_PROBABILITIES[item.id] || 0;
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return gifts[gifts.length - 1];
}

function generatePattern(gifts: TelegramGift[]): TelegramGift[] {
  const items: TelegramGift[] = [];
  
  // Гарантируем что все подарки есть хотя бы раз
  gifts.forEach(gift => {
    items.push({...gift});
  });
  
  // Дополняем до PATTERN_SIZE случайными
  while (items.length < PATTERN_SIZE) {
    items.push(weightedRandomSelect(gifts));
  }
  
  // Перемешиваем (Fisher-Yates)
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  
  return items;
}

function generatePatternWithTarget(gifts: TelegramGift[], targetGift: TelegramGift): TelegramGift[] {
  const otherGifts = gifts.filter(g => g.id !== targetGift.id);
  
  const items: TelegramGift[] = [];
  
  items[0] = {...targetGift};
  
  for (let i = 1; i < PATTERN_SIZE; i++) {
    const randomGift = otherGifts[Math.floor(Math.random() * otherGifts.length)];
    items.push({...randomGift});
  }
  
  return items;
}

function getPossibleGifts(gifts: TelegramGift[]): (TelegramGift & { chance: number })[] {
  return gifts.map((gift) => ({
    ...gift,
    chance: GIFT_PROBABILITIES[gift.id] || 0,
  }));
}

export function Play() {
  const { user, addBalance, refreshBalance } = useAuth();
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<TelegramGift[]>(DEFAULT_GIFTS);
  const [rouletteItems, setRouletteItems] = useState<TelegramGift[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);
  const [autoSpinAfterDeposit, setAutoSpinAfterDeposit] = useState(false);

  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const spinCancelledRef = useRef(false);

  const initializeRoulette = useCallback(() => {
    const items = generatePattern(availableGifts);
    setRouletteItems(items);
    setPossibleGifts(getPossibleGifts(availableGifts));
    offsetRef.current = 0;
  }, [availableGifts]);

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
    if (!loading && availableGifts.length > 0) {
      initializeRoulette();
    }
  }, [loading, availableGifts.length]);

  useEffect(() => {
    if (autoSpinAfterDeposit && user && user.balance >= SPIN_COST && !spinning) {
      setAutoSpinAfterDeposit(false);
      handleSpin();
    }
  }, [autoSpinAfterDeposit, user, spinning]);

  const startScrolling = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    let speed = 0;
    const targetSpeed = SCROLL_SPEED;
    const acceleration = 0.02;

    const animate = () => {
      const rouletteEl = rouletteRef.current;
      if (!rouletteEl) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Плавное ускорение
      if (speed < targetSpeed) {
        speed += acceleration;
        if (speed > targetSpeed) speed = targetSpeed;
      }

      offsetRef.current += speed;
      // Сбрасываем на один паттерн назад
      if (offsetRef.current >= PATTERN_SIZE * ITEM_WIDTH) {
        offsetRef.current -= PATTERN_SIZE * ITEM_WIDTH;
      }

      if (rouletteEl) {
        rouletteEl.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleSpin = async () => {
    if (spinning || rouletteItems.length === 0) return;

    let targetGift: TelegramGift | null = null;
    let newBalance = user?.balance || 0;

    if (!demoMode && user) {
      if (user.balance < SPIN_COST) {
        setShowDeposit(true);
        return;
      }

      try {
        const response = await winApi.spin();
        if (!response.success) {
          if (response.error === 'Insufficient_balance') {
            setShowDeposit(true);
            return;
          }
          console.error('Spin failed:', response.error);
          return;
        }
        targetGift = {
          id: response.data.gift.id,
          name: response.data.gift.name,
          stars: response.data.gift.stars,
          animationSvg: response.data.gift.animationSvg,
          animationData: response.data.gift.animationData,
        };
        newBalance = response.data.balance;
        refreshBalance();
      } catch (err) {
        console.error('Failed to spin:', err);
        return;
      }
    } else {
      targetGift = weightedRandomSelect(availableGifts);
    }

    spinCancelledRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const targetItem = targetGift!;
    console.log('🎰 targetItem from server:', targetItem.id, targetItem.name);
    
    const patternWithTarget = generatePatternWithTarget(availableGifts, targetItem);
    console.log('🎰 patternWithTarget[0]:', patternWithTarget[0].id, patternWithTarget[0].name);
    setRouletteItems(patternWithTarget);

    const targetPosInPattern = 0;
    const fullLoopWidth = PATTERN_SIZE * ITEM_WIDTH;
    const offsetToCenter = 180;
    const targetPixel = targetPosInPattern * ITEM_WIDTH;
    const finalOffset = offsetToCenter + fullLoopWidth * 2.5;
    console.log('🎰 finalOffset:', finalOffset, 'fullLoopWidth:', fullLoopWidth, 'targetPosInPattern:', targetPosInPattern);

    offsetRef.current = 0;
    const startOffset = 0;
    const startTime = performance.now();
    const duration = 3000;

    setSpinning(true);

    const animate = (timestamp: number) => {
      if (spinCancelledRef.current) {
        setSpinning(false);
        return;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      offsetRef.current = startOffset + finalOffset * eased;

      const rouletteEl = rouletteRef.current;
      if (rouletteEl) {
        rouletteEl.style.transform = `translateX(-${(offsetRef.current % TOTAL_WIDTH)}px)`;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        setSpinning(false);

        const finalPx = offsetRef.current % TOTAL_WIDTH;
        const centerX = 180;
        const itemAtCenter = Math.floor((finalPx + centerX) / ITEM_WIDTH) % PATTERN_SIZE;
        const actualItem = patternWithTarget[itemAtCenter];
        console.log('🎰 actual item at center:', itemAtCenter, actualItem.id, actualItem.name);
        console.log('🎰 expected item:', targetItem.id, targetItem.name);

        const finalWonItem = patternWithTarget[targetPosInPattern];
        setWonGift(finalWonItem);
        setShowResult(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const closeModal = () => {
    setShowResult(false);
    // Не запускаем прокрутку - оставляем как есть
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
          {[...rouletteItems, ...rouletteItems, ...rouletteItems].map((item, index) => (
            <div key={index} className="play__roulette-item">
              <div className="play__roulette-emoji">
                {item.animationSvg ? (
                  <GiftImage svgContent={item.animationSvg} size={70} uniqueId={`roulette-${index}`} />
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
