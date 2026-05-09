import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Crash.css';

function generateCrashPoint(): number {
  const r = Math.random();
  return Math.max(1.01, 1 / (1 - r));
}

function generateStars(count: number, big: boolean) {
  return Array.from({ length: count }, (_, i) => ({
    key: `${big ? 'b' : 's'}-${i}`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    w: `${big ? 1.5 + Math.random() * 1.5 : 0.5 + Math.random() * 1}px`,
    h: `${big ? 1.5 + Math.random() * 1.5 : 0.5 + Math.random() * 1}px`,
    delay: `${Math.random() * 5}s`,
    dur: `${2 + Math.random() * 4}s`,
    minOp: `${0.2 + Math.random() * 0.3}`,
    maxOp: `${0.6 + Math.random() * 0.4}`,
    cls: big ? 'crash__star crash__star--big' : 'crash__star',
  }));
}

const smallStars = generateStars(120, false);
const bigStars = generateStars(40, true);

export function Crash() {
  const navigate = useNavigate();
  const animRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const crashPointRef = useRef(2.0);
  const gameStateRef = useRef<'idle' | 'flying' | 'crashed'>('idle');

  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'flying' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(0);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);

  const startNewRound = useCallback(() => {
    setGameState('idle');
    gameStateRef.current = 'idle';
    setMultiplier(1.00);
  }, []);

  const onCrash = useCallback((cp: number) => {
    gameStateRef.current = 'crashed';
    setGameState('crashed');
    setMultiplier(cp);
    setCrashHistory(prev => [cp, ...prev].slice(0, 20));

    setCountdown(5);
    let remaining = 5;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        startNewRound();
        return;
      }
      setCountdown(remaining);
    }, 1000);
  }, [startNewRound]);

  const tick = useCallback(() => {
    if (gameStateRef.current !== 'flying') return;
    const cp = crashPointRef.current;
    elapsedRef.current += 50;
    const t = elapsedRef.current / 1000;
    const m = Math.pow(1.6, t);

    if (m >= cp) {
      onCrash(cp);
      return;
    }

    setMultiplier(m);
    animRef.current = requestAnimationFrame(tick);
  }, [onCrash]);

  const startGame = useCallback(() => {
    if (gameStateRef.current !== 'idle') return;
    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    elapsedRef.current = 0;
    setMultiplier(1.00);
    gameStateRef.current = 'flying';
    setGameState('flying');
    animRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const cancelAll = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  useEffect(() => {
    return () => cancelAll();
  }, [cancelAll]);

  const handleBet = () => {
    if (gameState === 'idle') startGame();
  };

  return (
    <div className="crash">
      <div className="crash__nebula crash__nebula--purple" />
      <div className="crash__nebula crash__nebula--blue" />
      <div className="crash__nebula crash__nebula--pink" />
      <div className="crash__stars-layer">
        {[...smallStars, ...bigStars].map(s => (
          <div
            key={s.key}
            className={s.cls}
            style={{
              left: s.left,
              top: s.top,
              width: s.w,
              height: s.h,
              animationDelay: s.delay,
              animationDuration: s.dur,
              '--min-opacity': s.minOp,
              '--max-opacity': s.maxOp,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <button className="crash__back-btn" onClick={() => { cancelAll(); navigate('/play'); }}>← Назад</button>

      <div className="crash__center">
        <div className={`crash__multiplier${gameState === 'crashed' ? ' crash__multiplier--crashed' : ''}${gameState === 'flying' ? ' crash__multiplier--flying' : ''}`}>
          {gameState === 'idle' ? '1.00x' : `${multiplier.toFixed(2)}x`}
        </div>
        {gameState === 'crashed' && (
          <div className="crash__countdown">{countdown}</div>
        )}
      </div>

      <div className="crash__bottom">
        <div className="crash__history">
          {crashHistory.map((cp, i) => (
            <div key={i} className="crash__history-item">{cp.toFixed(2)}x</div>
          ))}
        </div>
        <button
          className={`crash__bet-btn${gameState !== 'idle' ? ' crash__bet-btn--disabled' : ''}`}
          onClick={handleBet}
          disabled={gameState !== 'idle'}
        >
          {gameState === 'idle' ? 'Сделать ставку' : gameState === 'flying' ? 'Взлетает...' : `Перезапуск через ${countdown}...`}
        </button>
      </div>
    </div>
  );
}
