import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const crashPointRef = useRef(2.0);
  const gameStateRef = useRef<'waiting' | 'flying' | 'crashed'>('waiting');
  const rocketRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const waitingStartRef = useRef(0);

  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [multiplier, setMultiplier] = useState(1.00);
  const [waitingCountdown, setWaitingCountdown] = useState(5);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);

  const cancelAll = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const startFlying = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    elapsedRef.current = 0;
    setMultiplier(1.00);
    gameStateRef.current = 'flying';
    setGameState('flying');

    if (lottieRef.current) lottieRef.current.play();

    const tick = () => {
      if (gameStateRef.current !== 'flying') return;
      elapsedRef.current += 50;
      const t = elapsedRef.current / 1000;
      const m = Math.pow(1.6, t);

      if (m >= crashPointRef.current) {
        gameStateRef.current = 'crashed';
        setGameState('crashed');
        const cp = crashPointRef.current;
        setMultiplier(cp);
        setCrashHistory(prev => [cp, ...prev].slice(0, 20));
        if (lottieRef.current) lottieRef.current.stop();
        timerRef.current = setTimeout(() => startWaiting(), 1500);
        return;
      }

      setMultiplier(m);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  }, []);

  const startWaiting = useCallback(() => {
    gameStateRef.current = 'waiting';
    setGameState('waiting');
    setMultiplier(1.00);
    setWaitingCountdown(5);
    waitingStartRef.current = Date.now();

    if (lottieRef.current) {
      lottieRef.current.goToAndStop(0);
    }

    const tickWaiting = () => {
      if (gameStateRef.current !== 'waiting') return;
      const elapsed = (Date.now() - waitingStartRef.current) / 1000;
      const remaining = Math.max(0, 5 - elapsed);
      setWaitingCountdown(Math.ceil(remaining));

      if (remaining <= 0) {
        startFlying();
        return;
      }

      timerRef.current = setTimeout(tickWaiting, 200);
    };

    timerRef.current = setTimeout(tickWaiting, 200);
  }, [startFlying]);

  const handleBet = useCallback(() => {
    if (gameState !== 'waiting') return;
    startFlying();
  }, [gameState, startFlying]);

  useEffect(() => {
    startWaiting();
    return () => cancelAll();
  }, [startWaiting, cancelAll]);

  useEffect(() => {
    if (!rocketRef.current) return;
    fetch('/assets/cmn/crashrocket.json')
      .then(r => r.json())
      .then(data => {
        if (rocketRef.current) {
          lottieRef.current = lottie.loadAnimation({
            container: rocketRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: false,
            animationData: data,
          });
          lottieRef.current.goToAndStop(0);
        }
      })
      .catch(() => {});

    return () => {
      if (lottieRef.current) lottieRef.current.destroy();
    };
  }, []);

  const btnText = gameState === 'waiting'
    ? 'Сделать ставку'
    : gameState === 'flying'
    ? `x${multiplier.toFixed(2)}`
    : `x${multiplier.toFixed(2)}`;

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
              left: s.left, top: s.top, width: s.w, height: s.h,
              animationDelay: s.delay, animationDuration: s.dur,
              '--min-opacity': s.minOp, '--max-opacity': s.maxOp,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <button className="crash__back-btn" onClick={() => { cancelAll(); navigate('/play'); }}>← Назад</button>

      <div className="crash__center">
        <div className="crash__rocket-wrap">
          <div className="crash__rocket" ref={rocketRef} />
        </div>

        <div className={`crash__multiplier${gameState === 'crashed' ? ' crash__multiplier--crashed' : ''}${gameState === 'flying' ? ' crash__multiplier--flying' : ''}`}>
          {gameState === 'waiting' ? '1.00x' : `${multiplier.toFixed(2)}x`}
        </div>

        {gameState === 'waiting' && (
          <div className="crash__waiting-timer">
            <button className="crash__bet-btn" onClick={handleBet}>
              Сделать ставку
            </button>
            <div className="crash__waiting-label">Старт через {waitingCountdown}с</div>
          </div>
        )}

        {gameState === 'crashed' && (
          <div className="crash__crashed-label">КРАХ</div>
        )}
      </div>

      <div className="crash__bottom">
        <div className="crash__history">
          {crashHistory.map((cp, i) => (
            <div key={i} className="crash__history-item">{cp.toFixed(2)}x</div>
          ))}
        </div>
      </div>
    </div>
  );
}
