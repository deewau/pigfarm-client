import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import './Crash.css';

function generateCrashPoint(): number {
  const r = Math.random();
  return Math.max(1.01, 1 / (1 - r));
}

const PRESETS = [10, 25, 50, 100];

export function Crash() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketRef = useRef<HTMLDivElement>(null);
  const lottieAnimRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const lottieLoadedRef = useRef(false);

  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'flying' | 'crashed'>('idle');
  const [displayMultiplier, setDisplayMultiplier] = useState(1.00);

  const crashPointRef = useRef(2.0);
  const elapsedRef = useRef(0);
  const currentMultiplierRef = useRef(1.0);
  const isCrashedRef = useRef(false);

  function drawCurve(mult: number, isCrashed: boolean) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr;
    const h = canvas.clientHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.scale(dpr, dpr);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const pad = 40;
    const graphW = cw - pad * 2;
    const graphH = ch - pad * 2;
    const originX = pad;
    const originY = ch - pad;

    ctx.clearRect(0, 0, cw, ch);

    const maxMult = Math.max(mult * 1.2, 2.0);
    const t = Math.min(elapsedRef.current / 1000, 10);

    const points: { x: number; y: number }[] = [];
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const stepT = (t / steps) * i;
      const m = Math.pow(1.5, stepT);
      const x = originX + (i / steps) * graphW;
      points.push({ x, y: originY - (m / maxMult) * graphH });
    }

    const gradient = ctx.createLinearGradient(0, originY, 0, pad);
    if (isCrashed) {
      gradient.addColorStop(0, '#ff453a');
      gradient.addColorStop(1, '#ff6b6b');
    } else {
      gradient.addColorStop(0, '#ff453a');
      gradient.addColorStop(1, '#ff9f43');
    }

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (isCrashed && points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ff453a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 69, 58, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (points.length > 1) {
      const last = points[points.length - 1];
      const prev = points[points.length - 2] || points[0];
      const angle = Math.atan2(-(last.y - prev.y), last.x - prev.x);
      const rocketEl = rocketRef.current;
      if (rocketEl) {
        const container = canvas.closest('.crash__game-area');
        if (container) {
          const rect = container.getBoundingClientRect();
          const rx = rect.width * (last.x / cw);
          const ry = rect.height * (last.y / ch);
          rocketEl.style.left = `${rx}px`;
          rocketEl.style.top = `${ry}px`;
          rocketEl.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const yPos = originY - (graphH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad, yPos);
      ctx.lineTo(cw - pad, yPos);
      ctx.stroke();
    }
  }

  function tick() {
    if (isCrashedRef.current) return;

    const cp = crashPointRef.current;
    const t = elapsedRef.current / 1000;
    const m = Math.pow(1.5, t);
    currentMultiplierRef.current = m;
    setDisplayMultiplier(m);

    if (m >= cp) {
      isCrashedRef.current = true;
      setGameState('crashed');
      setDisplayMultiplier(cp);
      drawCurve(cp, true);
      if (lottieAnimRef.current) lottieAnimRef.current.stop();
      return;
    }

    drawCurve(m, false);
    elapsedRef.current += 50;
    animFrameRef.current = requestAnimationFrame(tick);
  }

  function startGame() {
    if (gameState === 'flying') return;

    const cp = generateCrashPoint();
    crashPointRef.current = cp;
    elapsedRef.current = 0;
    currentMultiplierRef.current = 1.0;
    isCrashedRef.current = false;
    setDisplayMultiplier(1.00);
    setGameState('flying');

    if (lottieAnimRef.current && lottieLoadedRef.current) {
      lottieAnimRef.current.goToAndPlay(0);
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tick);
  }

  function cashOut() {
    if (gameState !== 'flying' || isCrashedRef.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isCrashedRef.current = true;
    setGameState('crashed');
    const m = currentMultiplierRef.current;
    drawCurve(m, true);
    if (lottieAnimRef.current) lottieAnimRef.current.stop();
  }

  function resetGame() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isCrashedRef.current = false;
    setGameState('idle');
    setDisplayMultiplier(1.00);
    currentMultiplierRef.current = 1.0;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (lottieAnimRef.current && lottieLoadedRef.current) {
      lottieAnimRef.current.goToAndStop(0);
    }
  }

  useEffect(() => {
    const loadAnim = async () => {
      try {
        const response = await fetch('/gifts/5170564780938756245.json');
        const data = await response.json();
        if (rocketRef.current) {
          lottieAnimRef.current = lottie.loadAnimation({
            container: rocketRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: false,
            animationData: data,
          });
          lottieAnimRef.current.goToAndStop(0);
          lottieLoadedRef.current = true;
        }
      } catch (e) {
        console.warn('Failed to load rocket animation:', e);
      }
    };
    loadAnim();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (lottieAnimRef.current) lottieAnimRef.current.destroy();
    };
  }, []);

  function handleAction() {
    if (gameState === 'idle') startGame();
    else if (gameState === 'flying') cashOut();
    else resetGame();
  }

  let btnClass = 'crash__bet-btn';
  let btnText = 'Сделать ставку';
  if (gameState === 'idle') {
    btnClass += ' crash__bet-btn--idle';
  } else if (gameState === 'flying') {
    btnClass += ' crash__bet-btn--flying';
    btnText = 'Забрать';
  } else {
    btnClass += ' crash__bet-btn--idle';
    btnText = 'Играть снова';
  }

  return (
    <div className="crash">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>

      <div className="crash__game-area">
        <canvas ref={canvasRef} className="crash__canvas" />
        <div className={`crash__multiplier${gameState === 'crashed' ? ' crash__multiplier--crashed' : ''}`}>
          {gameState === 'idle' ? '1.00x' : `${displayMultiplier.toFixed(2)}x`}
        </div>
        <div className="crash__rocket-container" ref={rocketRef} />
        <div className={`crash__status${gameState === 'crashed' ? ' crash__status--crashed' : ''}`}>
          {gameState === 'idle' && 'Ожидание ставки'}
          {gameState === 'flying' && 'ВЗЛЕТАЕТ'}
          {gameState === 'crashed' && 'КРАХ'}
        </div>
      </div>

      <div className="crash__controls">
        <div className="crash__bet-row">
          <div className="crash__bet-input-wrap">
            <span className="crash__bet-label">Ставка</span>
            <input
              className="crash__bet-input"
              type="number"
              min={1}
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value) || 1))}
              disabled={gameState !== 'idle'}
            />
            <span className="crash__bet-currency">⭐</span>
          </div>
          <div className="crash__presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                className="crash__preset-btn"
                onClick={() => setBetAmount(p)}
                disabled={gameState !== 'idle'}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <button className={btnClass} onClick={handleAction}>
          {btnText}
        </button>
      </div>
    </div>
  );
}
