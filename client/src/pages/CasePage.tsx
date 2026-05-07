import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Play.css';
import { giftApi, winApi } from '../services/api';
import { GiftImage } from '../components/GiftAnimation';
import { ResultModal } from '../components/ResultModal';
import { GiftInfoModal } from '../components/GiftInfoModal';
import { DepositModal } from '../components/DepositModal';
import { LiveFeed } from '../components/LiveFeed';
import { useAuth } from '../hooks/useAuth';
import { useLiveFeed, type WinItem } from '../contexts/LiveFeedContext';
import type { TelegramGift } from './Play';

const PATTERN_SIZE = 30;
const LOOPS = 3;
const TARGET_POSITION = 10;

// Импортируем данные и вероятности из Play (для MVP копируем, потом вынесем в общий файл)
const GIFTS_LOW = [
  { id: '5170145012310081615', name: 'Сердце', stars: 15 },
  { id: '5170233102089322756', name: 'Мишка', stars: 15 },
  { id: '5170250947678437525', name: 'Подарок', stars: 25 },
  { id: '5168103777563050263', name: 'Роза', stars: 25 },
  { id: '5170144170496491616', name: 'Торт', stars: 50 },
  { id: '5170314324215857265', name: 'Букет', stars: 50 },
  { id: '5170564780938756245', name: 'Ракета', stars: 50 },
  { id: '6028601630662853006', name: 'Шампанское', stars: 50 },
  { id: '5168043875654172773', name: 'Кубок', stars: 100 },
  { id: '5170690322832818290', name: 'Кольцо', stars: 100 },
  { id: '5170521118301225164', name: 'Алмаз', stars: 100 },
];

const PROBABILITIES_LOW: Record<string, number> = {
  '5170145012310081615': 18.72, '5170233102089322756': 18.72,
  '5170250947678437525': 30.63, '5168103777563050263': 30.05,
  '5170144170496491616': 0.406, '5170314324215857265': 0.506,
  '5170564780938756245': 0.506, '6028601630662853006': 0.506,
  '5168043875654172773': 0.715, '5170690322832818290': 0.812,
  '5170521118301225164': 0.812,
};

const GIFTS_HIGH = [
  { id: '5170250947678437525', name: 'Подарок', stars: 25 },
  { id: '5168103777563050263', name: 'Роза', stars: 25 },
  { id: '6028601630662853006', name: 'Шампанское', stars: 50 },
  { id: '5170564780938756245', name: 'Ракета', stars: 50 },
  { id: '5170314324215857265', name: 'Букет', stars: 50 },
  { id: '5170144170496491616', name: 'Торт', stars: 50 },
  { id: 'vicecream', name: 'Мороженое', stars: 370, isSpecial: true },
  { id: 'chillflame', name: 'Chill Flame', stars: 345, isSpecial: true },
  { id: 'poolfloat', name: 'Pool Float', stars: 350, isSpecial: true },
  { id: 'instantramen', name: 'Instant Ramen', stars: 390, isSpecial: true },
  { id: 'icecream', name: 'Ice Cream', stars: 380, isSpecial: true },
  { id: 'lolpop', name: 'Lol Pop', stars: 480, isSpecial: true },
  { id: 'snakebox', name: 'Snake Box', stars: 350, isSpecial: true },
  { id: '5170690322832818290', name: 'Кольцо', stars: 100 },
  { id: '5170521118301225164', name: 'Алмаз', stars: 100 },
  { id: '5168043875654172773', name: 'Кубок', stars: 100 },
];

const PROBABILITIES_HIGH: Record<string, number> = {
  '5170250947678437525': 9.16, '5168103777563050263': 9.16,
  '6028601630662853006': 13.40, '5170564780938756245': 13.40,
  '5170314324215857265': 13.40, '5170144170496491616': 13.40,
  'chillflame': 0.99, 'poolfloat': 0.89, 'instantramen': 0.84,
  'icecream': 0.91, 'lolpop': 0.70, 'snakebox': 0.81,
  '5170690322832818290': 3.50, '5170521118301225164': 3.50,
  '5168043875654172773': 3.50,
};

const GIFTS_VIP = [
  { id: '6028601630662853006', name: 'Шампанское', stars: 50 },
  { id: '5170564780938756245', name: 'Ракета', stars: 50 },
  { id: '5170314324215857265', name: 'Букет', stars: 50 },
  { id: '5170144170496491616', name: 'Торт', stars: 50 },
  { id: '5170690322832818290', name: 'Кольцо', stars: 100 },
  { id: '5170521118301225164', name: 'Алмаз', stars: 100 },
  { id: '5168043875654172773', name: 'Кубок', stars: 100 },
  { id: 'chillflame', name: 'Chill Flame', stars: 345, isSpecial: true },
  { id: 'vicecream', name: 'Vice Cream', stars: 370, isSpecial: true },
  { id: 'instantramen', name: 'Instant Ramen', stars: 390, isSpecial: true },
  { id: 'icecream', name: 'Ice Cream', stars: 380, isSpecial: true },
  { id: 'poolfloat', name: 'Pool Float', stars: 350, isSpecial: true },
  { id: 'virt240', name: 'Virt 240', stars: 240, isVirt: true },
  { id: 'virt490', name: 'Virt 490', stars: 490, isVirt: true },
];

const PROBABILITIES_VIP: Record<string, number> = {
  '6028601630662853006': 11.35, '5170564780938756245': 11.35,
  '5170314324215857265': 11.35, '5170144170496491616': 11.35,
  '5170690322832818290': 7.52, '5170521118301225164': 7.52,
  '5168043875654172773': 7.52, 'chillflame': 1.31, 'vicecream': 1.29,
  'instantramen': 1.26, 'icecream': 1.26, 'poolfloat': 1.24,
  'lolpop': 0.70, 'snakebox': 0.81, 'virt240': 2.27, 'virt490': 1.18,
};

type SpinCost = 29 | 49 | 99;

function weightedRandomSelect(gifts: TelegramGift[], probabilities: Record<string, number>): TelegramGift {
  const totalWeight = gifts.reduce((sum, item) => sum + (probabilities[item.id] || 0), 0);
  let random = Math.random() * totalWeight;
  for (const item of gifts) {
    if (random <= 0) return item;
    random -= (probabilities[item.id] || 0);
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
  return items;
}

function getPossibleGifts(gifts: TelegramGift[], probabilities: Record<string, number>): (TelegramGift & { chance: number })[] {
  return gifts.map((gift) => ({ ...gift, chance: probabilities[gift.id] || 0 }));
}

export function CasePage() {
  const { cost } = useParams<{ cost: string }>();
  const navigate = useNavigate();
  const spinCost: SpinCost = [29, 49, 99].includes(Number(cost)) ? (Number(cost) as SpinCost) : 29;
  
  const { user, addBalance, refreshBalance, refreshXp, setBalanceValue } = useAuth();
  const [demoMode, setDemoMode] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rouletteItems, setRouletteItems] = useState<TelegramGift[]>([]);
  const [possibleGifts, setPossibleGifts] = useState<(TelegramGift & { chance: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [wonGift, setWonGift] = useState<TelegramGift | null>(null);
  const [autoSpinAfterDeposit, setAutoSpinAfterDeposit] = useState(false);
  const [pendingTargetGift, setPendingTargetGift] = useState<TelegramGift | null>(null);
  const [infoGift, setInfoGift] = useState<TelegramGift | null>(null);
  
  const { liveWins, sliding, addOwnWin } = useLiveFeed();
  
  const rouletteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const spinCancelledRef = useRef(false);
  const giftsLoadedRef = useRef<TelegramGift[]>([]);
  const offsetRef = useRef(0);
  
  const getCurrentGifts = useCallback((): TelegramGift[] => {
    if (spinCost === 29) return giftsLoadedRef.current.length > 0 ? giftsLoadedRef.current.filter(g => [15, 25, 50, 100].includes(g.stars)) : GIFTS_LOW;
    if (spinCost === 49) return giftsLoadedRef.current.length > 0 ? giftsLoadedRef.current.filter(g => [25, 50, 100, 345, 350, 370, 380, 390, 480].includes(g.stars) || g.isSpecial) : GIFTS_HIGH;
    let gifts = giftsLoadedRef.current.length > 0 ? giftsLoadedRef.current.filter(g => [50, 100, 240, 345, 350, 370, 380, 390, 480, 490].includes(g.stars) || g.isSpecial || g.isVirt) : [];
    if (!gifts.some(g => g.id === 'virt240' && g.isVirt)) gifts.push({ id: 'virt240', name: 'Virt', stars: 240, isVirt: true } as TelegramGift);
    if (!gifts.some(g => g.id === 'virt490' && g.isVirt)) gifts.push({ id: 'virt490', name: 'Virt', stars: 490, isVirt: true } as TelegramGift);
    return gifts.length > 0 ? gifts : GIFTS_VIP;
  }, [spinCost]);

  const getCurrentProbabilities = useCallback((): Record<string, number> => {
    if (spinCost === 29) return PROBABILITIES_LOW;
    if (spinCost === 49) return PROBABILITIES_HIGH;
    return PROBABILITIES_VIP;
  }, [spinCost]);

  const initializeRoulette = useCallback(() => {
    const gifts = getCurrentGifts();
    const probabilities = getCurrentProbabilities();
    const items: TelegramGift[] = [];
    for (let loop = 0; loop < LOOPS; loop++) {
      for (let i = 0; i < PATTERN_SIZE; i++) {
        items.push(weightedRandomSelect(gifts, probabilities));
      }
    }
    setRouletteItems(items);
    setPossibleGifts(getPossibleGifts(gifts, probabilities));
  }, [getCurrentGifts, getCurrentProbabilities]);

  useEffect(() => {
    const loadGifts = async () => {
      try {
        setLoading(true);
        const response = await giftApi.getAll();
        if (response.success && response.data && response.data.length > 0) {
          giftsLoadedRef.current = response.data;
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
    if (!loading) initializeRoulette();
  }, [loading, spinCost, initializeRoulette]);

  useEffect(() => {
    const requiredBalance = spinCost;
    if (autoSpinAfterDeposit && user && user.balance >= requiredBalance && !spinning) {
      setAutoSpinAfterDeposit(false);
      handleSpin();
    }
  }, [autoSpinAfterDeposit, user, spinning, spinCost]);

  useEffect(() => {
    if (!pendingTargetGift || spinning || rouletteItems.length === 0) return;
    const newPattern = generatePatternWithTarget(getCurrentGifts(), pendingTargetGift);
    setRouletteItems(newPattern);
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const targetPos = (LOOPS - 1) * PATTERN_SIZE + TARGET_POSITION;
          const targetEl = document.querySelectorAll('.play__roulette-item')[targetPos] as HTMLElement;
          const containerEl = document.querySelector('.play__roulette-container');
          if (!targetEl || !containerEl || !rouletteRef.current) { setPendingTargetGift(null); return; }
          const winnerCenter = targetEl.offsetLeft + targetEl.offsetWidth / 2;
          const containerRect = containerEl.getBoundingClientRect();
          const markerCenter = containerRect.width / 2;
          const targetX = markerCenter - winnerCenter;
          offsetRef.current = 0;
          if (rouletteRef.current) rouletteRef.current.style.transform = `translateX(0px)`;
          const startTime = performance.now();
          const duration = 6000;
          setSpinning(true);
          const animate = (timestamp: number) => {
            if (spinCancelledRef.current) { setSpinning(false); return; }
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentX = targetX * easeOut;
            if (rouletteRef.current) rouletteRef.current.style.transform = `translateX(${Math.floor(currentX)}px)`;
            if (progress < 1) { animationRef.current = requestAnimationFrame(animate); }
            else {
              if (rouletteRef.current) rouletteRef.current.style.transform = `translateX(${Math.floor(targetX)}px)`;
              setSpinning(false); setPendingTargetGift(null); setWonGift(pendingTargetGift); setShowResult(true);
            }
          };
          animationRef.current = requestAnimationFrame(animate);
        });
      });
    }, 100);
  }, [pendingTargetGift]);

  const handleSpin = async () => {
    if (spinning || rouletteItems.length === 0) return;
    const requiredBalance = spinCost;
    let targetGift: TelegramGift | null = null;
    if (!demoMode && user) {
      if (user.balance < requiredBalance) { setShowDeposit(true); return; }
      try {
        const response = await winApi.spin(spinCost);
        if (!response.success) { if (response.error === 'Insufficient balance') setShowDeposit(true); return; }
        targetGift = {
          id: response.data.gift.id, name: response.data.gift.name, stars: response.data.gift.stars,
          animationSvg: response.data.gift.animationSvg, animationData: response.data.gift.animationData,
          isSpecial: response.data.gift.isSpecial || false, isVirt: response.data.gift.isVirt || false,
        };
        if (response.data?.data?.balance !== undefined) setBalanceValue(response.data.data.balance);
        else refreshBalance();
        refreshXp();
      } catch (err) { return; }
    } else {
      targetGift = weightedRandomSelect(getCurrentGifts(), getCurrentProbabilities());
      if (targetGift.isVirt) {
        try {
          const response = await fetch(`/assets/gifts/${targetGift.id}.json`);
          if (response.ok) { const data = await response.json(); targetGift = { ...targetGift, animationData: data }; }
        } catch (e) { console.warn('Failed to load VIRT gift animation:', e); }
      }
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setPendingTargetGift(targetGift);
  };

  const handleGoToProfile = () => {
    setShowResult(false);
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.BackButton) tg.BackButton.show();
  };

  if (loading) return <div className="play"><div className="play__loading">Загрузка подарков...</div></div>;
  if (!user && !demoMode) return <div className="play"><div className="play__loading">Необходимо войти через Telegram</div></div>;

  const costLabel = demoMode ? 'Крутить!' : `${spinCost} ⭐`;

  return (
    <div className="play">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>
      <LiveFeed wins={liveWins} sliding={sliding} />
      <div className="play__roulette-container" ref={containerRef}>
        <div className="play__roulette-pointer" />
        <div className="play__roulette" ref={rouletteRef}>
          {rouletteItems.map((item, index) => (
            <div key={index} data-roulette-index={index} className={`play__roulette-item${item.isSpecial ? ' play__roulette-item--special' : ''}${item.isVirt ? ' play__roulette-item--virt' : ''}`}>
              {item.isSpecial && <div className="nft-ribbon"><span>NFT</span></div>}
              {item.isVirt && <div className="virt-ribbon"><span>VIRT</span></div>}
              <div className="play__roulette-emoji">
                {item.animationSvg ? (
                  <GiftImage svgContent={item.animationSvg} size={70} uniqueId={`roulette-${index}`} />
                ) : (
                  <GiftImage giftId={item.id} size={70} fallbackEmoji="🎁" />
                )}
              </div>
              <div className="play__roulette-cost-badge">{item.stars} ⭐</div>
            </div>
          ))}
        </div>
      </div>

      <div className="play__controls">
        <button className={`play__play-btn ${spinning ? 'play__play-btn--spinning' : ''}`} onClick={handleSpin} disabled={spinning}>
          {spinning ? '🎰 Крутится...' : `🎲 ${costLabel}`}
        </button>
        <div className="play__demo">
          <span className="play__demo-label">DEMO</span>
          <label className="play__demo-toggle">
            <input type="checkbox" checked={demoMode} onChange={() => { spinCancelledRef.current = false; setDemoMode(!demoMode); }} />
            <span className="play__demo-slider" />
          </label>
        </div>
      </div>

      <p className="play__subtitle">Вы можете выиграть...</p>
      <div className="play__gifts-grid">
        {possibleGifts.map((gift, i) => (
          <div key={i} className={`play__gift-card${gift.isSpecial ? ' play__gift-card--special' : ''}${gift.isVirt ? ' play__gift-card--virt' : ''}`}>
            {gift.isSpecial && <div className="nft-ribbon"><span>NFT</span></div>}
            {gift.isVirt && <div className="virt-ribbon"><span>VIRT</span></div>}
            {(gift.isSpecial || gift.isVirt) && (
              <div className="gift-info-btn" onClick={(e) => { e.stopPropagation(); setInfoGift(gift); }}>
                i
              </div>
            )}
            <div className="play__gift-emoji">
              {gift.animationSvg ? (
                <GiftImage svgContent={gift.animationSvg} size={80} uniqueId={`gift-${i}`} />
              ) : (
                <GiftImage giftId={gift.id} size={80} fallbackEmoji="🎁" />
              )}
            </div>
            <span className="play__gift-chance">{gift.chance.toFixed(2)}%</span>
            <span className="play__gift-cost">{gift.stars} ⭐</span>
          </div>
        ))}
      </div>

      {showResult && wonGift && (
        <ResultModal animationData={wonGift.animationData} animationSvg={wonGift.animationSvg} giftId={wonGift.id}
          onClose={() => setShowResult(false)} onDisableDemo={() => { setShowResult(false); setDemoMode(false); }}
          isDemo={demoMode} onGoToProfile={handleGoToProfile} isSpecial={wonGift.isSpecial} isVirt={wonGift.isVirt} />
      )}
      {infoGift && <GiftInfoModal gift={infoGift} onClose={() => setInfoGift(null)} />}
      {showDeposit && (
        <DepositModal isOpen={showDeposit} onClose={() => { spinCancelledRef.current = true; setShowDeposit(false); }}
          onDepositSuccess={(amount) => { addBalance(amount); refreshBalance(); setShowDeposit(false); setAutoSpinAfterDeposit(true); }} />
      )}
    </div>
  );
}
