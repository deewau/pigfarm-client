import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import './Crash.css';

type CrashState = 'waiting' | 'flying' | 'crashed' | 'pause' | 'loading';

interface BetInfo {
  userId: number;
  firstName: string;
  amount: number;
  cashOutAt: number | null;
}

const PRESETS = [10, 25, 50, 100, 250];

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

function generateSpeedParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `sp-${i}`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    dur: `${1 + Math.random() * 0.8}s`,
    w: `${1 + Math.random() * 2}px`,
    h: `${15 + Math.random() * 35}px`,
    op: `${0.3 + Math.random() * 0.5}`,
  }));
}

const speedParticles = generateSpeedParticles(25);

export function Crash() {
  const navigate = useNavigate();
  const lottieRef = useRef<any>(null);
  const rocketRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverTimeOffsetRef = useRef(0);
  const gameStateRef = useRef<CrashState>('loading');
  const multiplierRef = useRef(1.0);
  const lastTickRef = useRef<{ serverTime: number; multiplier: number } | null>(null);
  const phaseEndsAtRef = useRef<number | null>(null);
  const crashPointRef = useRef(0);
  const betsRef = useRef<BetInfo[]>([]);
  const yourBetRef = useRef<number | null>(null);
  const yourCashOutRef = useRef<number | null>(null);
  const resultMsgRef = useRef<string | null>(null);
  const lastCashOutRef = useRef<{ multiplier: number; won: number } | null>(null);
  const balanceRef = useRef(0);
  const rafRef = useRef(0);

  const [gameState, setGameState] = useState<CrashState>('loading');
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [displayCountdown, setDisplayCountdown] = useState(0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [bets, setBets] = useState<BetInfo[]>([]);
  const [yourBet, setYourBet] = useState<number | null>(null);
  const [yourCashOut, setYourCashOut] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(25);
  const [balance, setBalance] = useState(0);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [lastCashOut, setLastCashOut] = useState<{ multiplier: number; won: number } | null>(null);
  const [ping, setPing] = useState(0);
  const hasSyncedRef = useRef(false);
  const isMountedRef = useRef(true);

  const getServerTime = () => Date.now() + serverTimeOffsetRef.current;

  const getWsUrl = useCallback(() => {
    const isDev = window.location.port === '5173';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isDev ? 'localhost:3000' : window.location.host;
    const tg = (window as any).Telegram?.WebApp;
    const initData = encodeURIComponent(tg?.initData || '');
    return `${protocol}//${host}/ws/crash?initData=${initData}`;
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const handleMessage = useCallback((msg: any) => {
    if (msg.server_time) {
      serverTimeOffsetRef.current = msg.server_time - Date.now();
    }

    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      send({ type: 'ping', t: Date.now() });
    }

    switch (msg.type) {
      case 'state': {
        const state = msg.state as CrashState;
        gameStateRef.current = state;
        setGameState(state);

        if (msg.history) setHistory(msg.history);
        if (msg.balance !== undefined) { balanceRef.current = msg.balance; setBalance(msg.balance); }

        if (msg.phase_ends_at !== undefined) phaseEndsAtRef.current = msg.phase_ends_at;

        if (state === 'waiting') {
          multiplierRef.current = 1.0;
          lastTickRef.current = null;
          crashPointRef.current = 0;
          setCrashPoint(0);
          yourBetRef.current = null; setYourBet(null);
          yourCashOutRef.current = null; setYourCashOut(null);
          lastCashOutRef.current = null; setLastCashOut(null);
          betsRef.current = []; setBets([]);
          resultMsgRef.current = null; setResultMsg(null);
        }
        if (state === 'flying' && msg.multiplier) {
          multiplierRef.current = msg.multiplier;
          lastTickRef.current = { serverTime: getServerTime(), multiplier: msg.multiplier };
        }
        if (state === 'crashed') {
          crashPointRef.current = msg.crash_point;
          setCrashPoint(msg.crash_point);
          multiplierRef.current = msg.crash_point;
          if (msg.results) {
            const tg = (window as any).Telegram?.WebApp;
            const myResult = msg.results.find((r: any) => tg?.initDataUnsafe?.user?.id === r.userId);
            if (myResult) {
              resultMsgRef.current = myResult.crashed
                ? `Проиграно ${myResult.amount}⭐`
                : `Выиграно ${myResult.won}⭐ (x${myResult.cashOutAt})`;
              setResultMsg(resultMsgRef.current);
            }
          }
        }
        if (msg.your_bet !== undefined) { yourBetRef.current = msg.your_bet; setYourBet(msg.your_bet); }
        if (msg.your_cash_out !== undefined) { yourCashOutRef.current = msg.your_cash_out; setYourCashOut(msg.your_cash_out); }
        break;
      }
      case 'tick': {
        const m = msg.multiplier;
        multiplierRef.current = m;
        lastTickRef.current = { serverTime: getServerTime(), multiplier: m };
        break;
      }
      case 'bets':
        betsRef.current = msg.bets; setBets(msg.bets);
        break;
      case 'bet_result':
        if (msg.accepted) { yourBetRef.current = msg.amount; setYourBet(msg.amount); balanceRef.current = msg.balance; setBalance(msg.balance); }
        break;
      case 'cash_out_result':
        yourCashOutRef.current = msg.multiplier; setYourCashOut(msg.multiplier);
        lastCashOutRef.current = { multiplier: msg.multiplier, won: msg.won }; setLastCashOut(lastCashOutRef.current);
        break;
      case 'pong':
        if (msg.t) {
          const rtt = Date.now() - msg.t;
          setPing(rtt);
          const oneWay = rtt / 2;
          serverTimeOffsetRef.current = msg.server_time - (msg.t + oneWay);
        }
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🚀 Crash WS: connected');
      setGameState('waiting');
    };
    ws.onmessage = (event) => {
      try { handleMessage(JSON.parse(event.data)); } catch { return; }
    };
    ws.onclose = () => {
      console.log('🚀 Crash WS: disconnected');
      wsRef.current = null;
      if (!isMountedRef.current) return;
      setGameState('loading');
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => {};
  }, [getWsUrl, handleMessage, send]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [connect]);

  useEffect(() => {
    if (!rocketRef.current) return;
    fetch('/assets/cmn/crashrocket.json')
      .then(r => r.json())
      .then(data => {
        if (rocketRef.current) {
          lottieRef.current = lottie.loadAnimation({
            container: rocketRef.current, renderer: 'svg', loop: true, autoplay: false,
            animationData: data,
          });
          lottieRef.current.goToAndStop(0);
        }
      })
      .catch(() => {});
    return () => { if (lottieRef.current) lottieRef.current.destroy(); };
  }, []);

  useEffect(() => {
    if (gameState === 'flying' && lottieRef.current) lottieRef.current.play();
    else if (lottieRef.current) lottieRef.current.goToAndStop(0);
  }, [gameState]);

  useEffect(() => {
    const pingTimer = setInterval(() => send({ type: 'ping', t: Date.now() }), 10000);
    return () => clearInterval(pingTimer);
  }, [send]);

  useEffect(() => {
    const loop = () => {
      const serverNow = getServerTime();
      const state = gameStateRef.current;

      if (state === 'waiting' || state === 'pause' || state === 'crashed') {
        if (phaseEndsAtRef.current !== null) {
          const remaining = Math.max(0, Math.ceil((phaseEndsAtRef.current - serverNow) / 1000));
          setDisplayCountdown(remaining);
        }
      }

      if (state === 'flying') {
        if (lastTickRef.current) {
          const dt = (serverNow - lastTickRef.current.serverTime) / 1000;
          if (dt > 0 && dt < 1) {
            const estimated = lastTickRef.current.multiplier * Math.pow(1.6, dt / 9);
            const maxCp = crashPointRef.current || Infinity;
            multiplierRef.current = Math.min(estimated, maxCp);
          }
        }
      }

      setDisplayMultiplier(multiplierRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleBet = useCallback(() => {
    send({ type: 'bet', amount: betAmount });
  }, [send, betAmount]);

  const handleCashOut = useCallback(() => {
    send({ type: 'cash_out' });
  }, [send]);

  const cancelAll = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); }
  }, []);

  return (
    <div className={`crash${gameState === 'flying' ? ' crash--flying' : ''}`}>
      <div className="crash__nebula crash__nebula--purple" />
      <div className="crash__nebula crash__nebula--blue" />
      <div className="crash__nebula crash__nebula--pink" />
      <div className="crash__stars-layer">
        {[...smallStars, ...bigStars].map(s => (
          <div key={s.key} className={s.cls}
            style={{ left: s.left, top: s.top, width: s.w, height: s.h, animationDelay: s.delay, animationDuration: s.dur, '--min-opacity': s.minOp, '--max-opacity': s.maxOp } as React.CSSProperties} />
        ))}
      </div>

      {gameState === 'flying' && (
        <div className="crash__speed-layer">
          {speedParticles.map(p => (
            <div key={p.key} className="crash__speed-particle"
              style={{ left: p.left, top: p.top, width: p.w, height: p.h, animationDelay: p.delay, animationDuration: p.dur, opacity: p.op }} />
          ))}
        </div>
      )}

      <div className="crash__top-bar">
        <button className="crash__back-btn" onClick={() => { cancelAll(); navigate('/play'); }}>← Назад</button>
        <div className="crash__top-right">
          {ping > 0 && <div className="crash__ping">{ping}ms</div>}
          <div className="crash__balance">{balance}⭐</div>
        </div>
      </div>

      {gameState === 'loading' && (
        <div className="crash__loading">
          <div className="crash__loading-text">Подключение...</div>
        </div>
      )}

      <div className="crash__center">
        <div className={`crash__rocket-wrap${gameState === 'flying' ? '' : ' crash__rocket-wrap--hidden'}`}>
          <div className="crash__rocket" ref={rocketRef} />
        </div>

        {(gameState === 'waiting' || gameState === 'pause') && (
          <div className="crash__countdown-num">{displayCountdown}</div>
        )}

        {(gameState === 'flying' || gameState === 'crashed') && (
          <div className={`crash__multiplier ${gameState === 'crashed' ? 'crash__multiplier--crashed' : 'crash__multiplier--flying'}`}>
            {displayMultiplier.toFixed(2)}x
          </div>
        )}

        {resultMsg && (
          <div className={`crash__result-msg ${crashPoint > 0 && yourBet !== null && yourCashOut === null ? 'crash__result-msg--lose' : 'crash__result-msg--win'}`}>
            {resultMsg}
          </div>
        )}

        {lastCashOut && gameState !== 'crashed' && (
          <div className="crash__cashout-msg">
            Забрал x{lastCashOut.multiplier.toFixed(2)} = +{lastCashOut.won}⭐
          </div>
        )}

        <div className="crash__history">
          {history.map((cp, i) => (
            <div key={i} className="crash__history-item">{cp.toFixed(2)}x</div>
          ))}
        </div>

        {gameState === 'waiting' && yourBet === null && (
          <div className="crash__bet-controls">
            <div className="crash__presets">
              {PRESETS.map(p => (
                <button key={p} className={`crash__preset-btn ${betAmount === p ? 'crash__preset-btn--active' : ''}`}
                  onClick={() => setBetAmount(p)}>{p}</button>
              ))}
            </div>
            <button className="crash__bet-btn" onClick={handleBet}>
              Ставка {betAmount}⭐
            </button>
          </div>
        )}

        {gameState === 'waiting' && yourBet !== null && (
          <div className="crash__bet-placed">
            <div className="crash__bet-placed-text">Ставка {yourBet}⭐</div>
            <div className="crash__bet-placed-wait">Ожидание раунда...</div>
          </div>
        )}

        {gameState === 'flying' && yourBet !== null && yourCashOut === null && (
          <button className="crash__cashout-btn" onClick={handleCashOut}>
            Забрать {Math.floor(yourBet * displayMultiplier)}⭐
          </button>
        )}

        {gameState === 'flying' && yourBet !== null && yourCashOut !== null && (
          <div className="crash__cashout-done">
            Забрал x{yourCashOut.toFixed(2)} = {Math.floor(yourBet * yourCashOut)}⭐
          </div>
        )}
      </div>

      {(gameState === 'waiting' || gameState === 'flying') && bets.length > 0 && (
        <div className="crash__bets-panel">
          {bets.slice(0, 10).map(b => (
            <div key={b.userId} className="crash__bets-item">
              <span className="crash__bets-name">{b.firstName}</span>
              <span className="crash__bets-amount">{b.amount}⭐</span>
              {b.cashOutAt && <span className="crash__bets-cashout">x{b.cashOutAt.toFixed(2)}</span>}
            </div>
          ))}
        </div>
      )}

      {gameState === 'crashed' && (
        <div className="crash__crashed-label">КРАХ</div>
      )}
    </div>
  );
}
