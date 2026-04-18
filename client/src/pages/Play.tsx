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
const ITEM_GAP = 12;
const PATTERN_SIZE = 30;
const LOOPS = 3;
const TOTAL_ITEMS = PATTERN_SIZE * LOOPS;
const ITEM_FULL_WIDTH = ITEM_WIDTH + ITEM_GAP;
const TOTAL_WIDTH = TOTAL_ITEMS * ITEM_FULL_WIDTH;
const TARGET_POSITION = 10;

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

function generatePatternWithTarget(gifts: TelegramGift[], targetGift: TelegramGift): TelegramGift[] {
  const otherGifts = gifts.filter(g => g.id !== targetGift.id);
  const shuffled = [...otherGifts].sort(() => Math.random() - 0.5);
  const items: TelegramGift[] = [];
  
  for (let loop = 0; loop < LOOPS; loop++) {
    for (let i = 0; i < PATTERN_SIZE; i++) {
      if (loop === LOOPS - 1 && i === TARGET_POSITION) {
        items.push({...targetGift});
      } else {
        items.push({...shuffled[(loop * PATTERN_SIZE + i) % shuffled.length]});
      }
    }
  }
  
  console.log('🎰 PATTERN: targetGift.id=', targetGift.id, 'position=', (LOOPS-1)*PATTERN_SIZE+TARGET_POSITION, 'itemAtPos70=', items[70]?.id, items[70]?.name);
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
  const [pendingTargetGift, setPendingTargetGift] = useState<TelegramGift | null>(null);

  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const spinCancelledRef = useRef(false);

  const initializeRoulette = useCallback(() => {
    const items: TelegramGift[] = [];
    for (let loop = 0; loop < LOOPS; loop++) {
      for (let i = 0; i < PATTERN_SIZE; i++) {
        items.push(weightedRandomSelect(availableGifts));
      }
    }
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

  useEffect(() => {
    if (!pendingTargetGift || spinning || rouletteItems.length === 0) {
      return;
    }
    
    const targetIndex = rouletteItems.findIndex(item => item.id === pendingTargetGift.id);
    if (targetIndex === -1) {
      console.log('🎰 target not in pattern, generating new');
      const newPattern = generatePatternWithTarget(availableGifts, pendingTargetGift);
      setRouletteItems(newPattern);
      return;
    }
    
    console.log('🎰 target found at index:', targetIndex, 'name:', pendingTargetGift.name);
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!containerRef.current || !rouletteRef.current) {
          setPendingTargetGift(null);
          return;
        }
        
        rouletteRef.current.style.transform = `translateX(0px)`;
        
        requestAnimationFrame(() => {
          const targetIndex = rouletteItems.findIndex(item => item.id === pendingTargetGift.id);
          if (targetIndex === -1) {
            setPendingTargetGift(null);
            return;
          }
          const targetEl = document.querySelectorAll('.play__roulette-item')[targetIndex] as HTMLElement;
          if (!targetEl) {
            setPendingTargetGift(null);
            return;
          }
          const targetX = targetEl.offsetLeft + targetEl.offsetWidth / 2;
          const containerRect = containerRef.current!.getBoundingClientRect();
          const markerX = containerRect.width / 2;
          const targetCenterOffset = targetX - markerX;
          console.log('🎰 scroll: idx=', targetIndex, 'targetX=', targetX, 'marker=', markerX, 'finalOffset=', targetCenterOffset);
          
          offsetRef.current = 0;
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
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentOffset = targetCenterOffset * easeOut;
            offsetRef.current = currentOffset;
            
            if (rouletteRef.current) {
              rouletteRef.current.style.transform = `translateX(${-currentOffset}px)`;
            }

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animate);
            } else {
              const finalPos = Math.round(currentOffset / ITEM_FULL_WIDTH);
              const actualIndex = finalPos % rouletteItems.length;
              const landedGiftName = rouletteItems[actualIndex]?.name || 'unknown';
              console.log('🎰 result: finalPos=', finalPos, 'actualIdx=', actualIndex, 'gift=', landedGiftName, 'expected=', pendingTargetGift?.name);
              setSpinning(false);
              setPendingTargetGift(null);
              setWonGift(pendingTargetGift);
              setShowResult(true);
            }
          };

          animationRef.current = requestAnimationFrame(animate);
        });
      });
    });
  }, [pendingTargetGift, rouletteItems, spinning, availableGifts]);

  const handleSpin = async () => {
    if (spinning || rouletteItems.length === 0) return;

    let targetGift: TelegramGift | null = null;

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
          return;
        }
        targetGift = {
          id: response.data.gift.id,
          name: response.data.gift.name,
          stars: response.data.gift.stars,
          animationSvg: response.data.gift.animationSvg,
          animationData: response.data.gift.animationData,
        };
        refreshBalance();
      } catch (err) {
        return;
      }
    } else {
      targetGift = weightedRandomSelect(availableGifts);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    console.log('🎰 targetItem from server:', targetGift.id, targetGift.name);
    setPendingTargetGift(targetGift);
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
          {rouletteItems.map((item, index) => (
            <div key={index} data-roulette-index={index} className="play__roulette-item">
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
          onClose={() => setShowResult(false)}
          onDisableDemo={() => {
            setShowResult(false);
            setDemoMode(false);
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