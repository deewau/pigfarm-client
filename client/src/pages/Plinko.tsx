import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plinkoApi } from '../services/api';
import {
  formatMultiplier,
  getMultipliers,
  type PlinkoConfig,
  type PlinkoRisk,
} from '../services/plinkoConfig';
import { useAuth } from '../hooks/useAuth';
import { DepositModal } from '../components/DepositModal';
import './Plinko.css';

const MIN_BET = 1;
const MAX_BET = 10000;
const BET_PRESETS = [10, 25, 50, 100, 250];
const DEFAULT_ROWS = 12;
const RISK_LABELS: Record<PlinkoRisk, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

interface Peg {
  x: number;
  y: number;
}

interface Slot {
  x: number;
  y: number;
  multiplier: number;
  bucket: number;
}

interface BoardGeometry {
  width: number;
  height: number;
  pegs: Peg[];
  slots: Slot[];
  ballStart: { x: number; y: number };
}

function buildGeometry(rows: number, multipliers: number[], width: number): BoardGeometry {
  const height = Math.round(width * 1.05);
  const topPad = 36;
  const bottomPad = 52;
  const pegs: Peg[] = [];
  const rowGap = (height - topPad - bottomPad) / (rows + 1);
  const hMargin = width * 0.1;
  const usableW = width - hMargin * 2;

  for (let r = 0; r < rows; r++) {
    const pegCount = r + 1;
    const y = topPad + (r + 1) * rowGap;
    const spacing = usableW / (rows + 1);
    const rowWidth = (pegCount - 1) * spacing;
    const startX = (width - rowWidth) / 2;
    for (let c = 0; c < pegCount; c++) {
      pegs.push({ x: startX + c * spacing, y });
    }
  }

  const slots: Slot[] = [];
  const slotY = height - bottomPad / 2;
  const slotSpacing = usableW / rows;
  const slotsStart = (width - slotSpacing * rows) / 2;
  for (let i = 0; i <= rows; i++) {
    slots.push({
      x: slotsStart + i * slotSpacing,
      y: slotY,
      multiplier: multipliers[i] ?? 1,
      bucket: i,
    });
  }

  return {
    width,
    height,
    pegs,
    slots,
    ballStart: { x: width / 2, y: 14 },
  };
}

function rightsAtStep(path: number[], step: number): number {
  let s = 0;
  for (let i = 0; i <= step && i < path.length; i++) s += path[i];
  return s;
}

function ballTargetForRow(path: number[], row: number, geo: BoardGeometry, rows: number): { x: number; y: number } {
  const rights = rightsAtStep(path, row);
  const slot = geo.slots[rights] ?? geo.slots[0];
  const rowY = geo.ballStart.y + ((geo.height - geo.ballStart.y - 40) / rows) * (row + 1);
  const blend = row < rows - 1 ? 0.85 : 1;
  const targetX = geo.ballStart.x + (slot.x - geo.ballStart.x) * blend * ((row + 1) / rows);
  return { x: targetX, y: rowY };
}

function slotColor(multiplier: number, risk: PlinkoRisk): string {
  if (multiplier >= 50) return '#ff3b6b';
  if (multiplier >= 10) return '#ff8c42';
  if (multiplier >= 3) return '#ffd166';
  if (multiplier >= 1) return risk === 'low' ? '#4cd964' : '#5ac8fa';
  return '#8e8e93';
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  geo: BoardGeometry,
  risk: PlinkoRisk,
  ball: { x: number; y: number } | null,
  highlightBucket: number | null
) {
  const { width, height } = geo;
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#12182e');
  grad.addColorStop(1, '#0a0e1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (const slot of geo.slots) {
    const w = width / (geo.slots.length + 2);
    const isHi = highlightBucket === slot.bucket;
    ctx.fillStyle = isHi ? slotColor(slot.multiplier, risk) : 'rgba(255,255,255,0.06)';
    ctx.fillRect(slot.x - w / 2, slot.y - 8, w, 28);
    ctx.fillStyle = isHi ? '#fff' : slotColor(slot.multiplier, risk);
    ctx.font = `bold ${w > 28 ? 10 : 8}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = formatMultiplier(slot.multiplier);
    ctx.fillText(label, slot.x, slot.y + 6);
  }

  for (const peg of geo.pegs) {
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.shadowColor = 'rgba(124, 92, 255, 0.5)';
    ctx.shadowBlur = 6;
  }
  ctx.shadowBlur = 0;

  if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 8);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(1, risk === 'high' ? '#ff3b6b' : risk === 'low' ? '#4cd964' : '#7c5cff');
    ctx.fillStyle = ballGrad;
    ctx.fill();
  }
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function Plinko() {
  const navigate = useNavigate();
  const { user, refreshBalance, addBalance } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);

  const [config, setConfig] = useState<PlinkoConfig | null>(null);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [betAmount, setBetAmount] = useState(25);
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [isDropping, setIsDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [lastResult, setLastResult] = useState<{
    winAmount: number;
    profit: number;
    multiplier: number;
    gameId: number;
    serverSeedHash: string;
  } | null>(null);
  const [highlightBucket, setHighlightBucket] = useState<number | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const geoRef = useRef<BoardGeometry | null>(null);

  useEffect(() => {
    plinkoApi.getConfig().then((res) => {
      if (res.success && res.data) setConfig(res.data);
    }).catch(() => setError('Не удалось загрузить конфигурацию'));
  }, []);

  useEffect(() => {
    if (user) setBalance(user.balance);
  }, [user]);

  const multipliers = config ? getMultipliers(config, risk, rows) : [];

  const redraw = useCallback(
    (ball: { x: number; y: number } | null, hi: number | null) => {
      const canvas = canvasRef.current;
      const geo = geoRef.current;
      if (!canvas || !geo) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawBoard(ctx, geo, risk, ball, hi);
    },
    [risk]
  );

  const layoutBoard = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || multipliers.length === 0) return;

    const width = Math.min(wrap.clientWidth, 480);
    const geo = buildGeometry(rows, multipliers, width);
    geoRef.current = geo;
    canvas.width = geo.width;
    canvas.height = geo.height;
    setBallPos(geo.ballStart);
    redraw(geo.ballStart, highlightBucket);
  }, [rows, multipliers, redraw, highlightBucket]);

  useEffect(() => {
    layoutBoard();
    const onResize = () => layoutBoard();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layoutBoard]);

  useEffect(() => {
    redraw(ballPos, highlightBucket);
  }, [ballPos, highlightBucket, redraw]);

  const animateDrop = useCallback(
    (path: number[], bucket: number): Promise<void> => {
      return new Promise((resolve) => {
        const geo = geoRef.current;
        if (!geo) {
          resolve();
          return;
        }

        const steps: { from: { x: number; y: number }; to: { x: number; y: number }; ms: number }[] = [];
        let from = { ...geo.ballStart };
        for (let r = 0; r < path.length; r++) {
          const to = ballTargetForRow(path, r, geo, rows);
          steps.push({ from: { ...from }, to, ms: 120 + r * 8 });
          from = to;
        }
        const finalSlot = geo.slots[bucket];
        steps.push({ from, to: { x: finalSlot.x, y: finalSlot.y - 12 }, ms: 180 });

        let stepIndex = 0;
        let startTime = 0;

        const tick = (now: number) => {
          if (stepIndex >= steps.length) {
            setBallPos({ x: finalSlot.x, y: finalSlot.y - 12 });
            setHighlightBucket(bucket);
            redraw({ x: finalSlot.x, y: finalSlot.y - 12 }, bucket);
            resolve();
            return;
          }

          const step = steps[stepIndex];
          if (!startTime) startTime = now;
          const t = Math.min(1, (now - startTime) / step.ms);
          const e = easeOutCubic(t);
          const x = step.from.x + (step.to.x - step.from.x) * e;
          const y = step.from.y + (step.to.y - step.from.y) * e;
          setBallPos({ x, y });
          redraw({ x, y }, null);

          if (t >= 1) {
            stepIndex += 1;
            startTime = 0;
          }
          animRef.current = requestAnimationFrame(tick);
        };

        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(tick);
      });
    },
    [rows, redraw]
  );

  const handleDrop = async () => {
    if (!config || isDropping) return;
    if (betAmount < MIN_BET || betAmount > MAX_BET) {
      setError(`Ставка от ${MIN_BET} до ${MAX_BET} ⭐`);
      return;
    }
    if (balance < betAmount) {
      setShowDeposit(true);
      return;
    }

    setError(null);
    setLastResult(null);
    setHighlightBucket(null);
    setIsDropping(true);

    const geo = geoRef.current;
    if (geo) {
      setBallPos(geo.ballStart);
      redraw(geo.ballStart, null);
    }

    try {
      const result = await plinkoApi.drop(betAmount, rows, risk);
      if (!result.success) {
        if (result.error === 'INSUFFICIENT_BALANCE') setShowDeposit(true);
        else setError(result.error || 'Ошибка');
        setIsDropping(false);
        return;
      }

      const d = result.data;
      if (d.balance !== undefined) setBalance(d.balance);
      refreshBalance();

      await animateDrop(d.path, d.bucket);

      setLastResult({
        winAmount: d.winAmount,
        profit: d.profit,
        multiplier: d.multiplier,
        gameId: d.gameId,
        serverSeedHash: d.serverSeedHash,
      });
    } catch {
      setError('Ошибка соединения');
    } finally {
      setIsDropping(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const rowOptions = config
    ? Array.from({ length: config.maxRows - config.minRows + 1 }, (_, i) => config.minRows + i)
    : [];

  return (
    <div className="plinko">
      <div className="plinko__top-bar">
        <button type="button" className="plinko__back-btn" onClick={() => navigate('/play')}>
          ← Назад
        </button>
        <span style={{ fontWeight: 700 }}>{balance} ⭐</span>
      </div>

      <div className="plinko__board-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="plinko__canvas" />
      </div>

      <div className="plinko__controls">
        <div>
          <div className="plinko__label">Риск</div>
          <div className="plinko__row">
            {(['low', 'medium', 'high'] as PlinkoRisk[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`plinko__risk-btn${risk === r ? ' plinko__risk-btn--active' : ''}`}
                disabled={isDropping}
                onClick={() => setRisk(r)}
              >
                {RISK_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="plinko__label">Ряды ({rows})</div>
          <div className="plinko__rows-scroll">
            {rowOptions.map((n) => (
              <button
                key={n}
                type="button"
                className={`plinko__rows-btn${rows === n ? ' plinko__rows-btn--active' : ''}`}
                disabled={isDropping}
                onClick={() => setRows(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="plinko__label">Ставка</div>
          <div className="plinko__bet-row">
            <input
              type="number"
              className="plinko__bet-input"
              min={MIN_BET}
              max={MAX_BET}
              value={betAmount}
              disabled={isDropping}
              onChange={(e) => setBetAmount(Math.max(MIN_BET, parseInt(e.target.value, 10) || 0))}
            />
            {BET_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="plinko__bet-preset"
                disabled={isDropping}
                onClick={() => setBetAmount(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="plinko__error">{error}</div>}

        <button
          type="button"
          className="plinko__drop-btn"
          disabled={isDropping || !config}
          onClick={handleDrop}
        >
          {isDropping ? 'Падает…' : `Бросить · ${betAmount} ⭐`}
        </button>
      </div>

      {lastResult && (
        <div className={`plinko__result${lastResult.profit >= 0 ? ' plinko__result--win' : ' plinko__result--loss'}`}>
          <div>
            {lastResult.profit >= 0 ? 'Выигрыш' : 'Проигрыш'} · ×{lastResult.multiplier.toFixed(2)}
          </div>
          <div className="plinko__result-amount">
            {lastResult.profit >= 0 ? '+' : ''}
            {lastResult.profit} ⭐ ({lastResult.winAmount} ⭐)
          </div>
          <div className="plinko__fair" title={lastResult.serverSeedHash}>
            Provably Fair #{lastResult.gameId} · {lastResult.serverSeedHash.slice(0, 16)}…
          </div>
        </div>
      )}

      <DepositModal
        isOpen={showDeposit}
        onClose={() => setShowDeposit(false)}
        onDepositSuccess={(amount) => {
          addBalance(amount);
          refreshBalance();
          setShowDeposit(false);
        }}
      />
    </div>
  );
}

export default Plinko;
