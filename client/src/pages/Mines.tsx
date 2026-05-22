import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { minesApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { DepositModal } from '../components/DepositModal';
import { MinesBetSheet } from '../components/MinesBetSheet';
import './Mines.css';

const GRID_SIZE = 5;
const MIN_BET = 1;
const MAX_BET = 10000;
const HOUSE_EDGE = 0.03;

type CellState = 'hidden' | 'diamond' | 'mine';
type GamePhase = 'betting' | 'playing' | 'result';

interface CellData {
  state: CellState;
  row: number;
  col: number;
  revealed: boolean;
}

function getMultiplierForStep(minesCount: number, openedCount: number): number {
  const TOTAL_CELLS = 25;
  const remainingCells = TOTAL_CELLS - openedCount;
  const remainingMines = minesCount;
  const remainingSafe = remainingCells - remainingMines;
  const probability = remainingSafe / remainingCells;
  const fairMultiplier = 1 / probability;
  return fairMultiplier * (1 - HOUSE_EDGE);
}

function getCumulativeMultiplier(minesCount: number, openedCount: number): number {
  let mult = 1.0;
  for (let i = 0; i < openedCount; i++) {
    mult *= getMultiplierForStep(minesCount, i);
  }
  return mult;
}

function getNextMultiplier(minesCount: number, openedCount: number): number {
  return getCumulativeMultiplier(minesCount, openedCount + 1);
}

function getMaxMultiplier(minesCount: number): number {
  return getCumulativeMultiplier(minesCount, 25 - minesCount);
}

export function Mines() {
  const navigate = useNavigate();
  const { user, refreshBalance, addBalance } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const [phase, setPhase] = useState<GamePhase>('betting');
  const [minesCount, setMinesCount] = useState(3);
  const [betAmount, setBetAmount] = useState(25);
  const [balance, setBalance] = useState(user?.balance || 0);
  const [gameId, setGameId] = useState<number | null>(null);
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null);
  const [cells, setCells] = useState<CellData[]>(() =>
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      state: 'hidden' as CellState, row: Math.floor(i / GRID_SIZE), col: i % GRID_SIZE, revealed: false,
    }))
  );
  const [openedCount, setOpenedCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [currentWin, setCurrentWin] = useState(0);
  const [nextMultiplier, setNextMultiplier] = useState(0);
  const [showDeposit, setShowDeposit] = useState(false);
  const [animatingCell, setAnimatingCell] = useState<{ row: number; col: number } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'win' | 'loss' | null>(null);
  const [resultWinAmount, setResultWinAmount] = useState(0);
  const [allMines, setAllMines] = useState<{ row: number; col: number }[]>([]);
  const [pulseLose, setPulseLose] = useState(false);
  const [showAllMines, setShowAllMines] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minesDropdownOpen, setMinesDropdownOpen] = useState(false);
  const [showBetSheet, setShowBetSheet] = useState(false);

  const minesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!minesDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (minesDropdownRef.current && !minesDropdownRef.current.contains(e.target as Node)) {
        setMinesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [minesDropdownOpen]);

  const getWsUrl = useCallback(() => {
    const isDev = window.location.port === '5173';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isDev ? 'localhost:3000' : window.location.host;
    const tg = (window as any).Telegram?.WebApp;
    const initData = encodeURIComponent(tg?.initData || '');
    return `${protocol}//${host}/ws/mines?initData=${initData}`;
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Mines WS: connected');
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch { return; }
    };
    ws.onclose = () => {
      wsRef.current = null;
      if (!isMountedRef.current) return;
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };
    ws.onerror = () => {};
  }, [getWsUrl]);

  const handleWsMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case 'state':
        if (msg.balance !== undefined) setBalance(msg.balance);
        break;
      case 'game_state':
        setGameId(msg.gameId);
        setMinesCount(msg.minesCount);
        setBetAmount(msg.betAmount);
        setServerSeedHash(msg.serverSeedHash);
        setCurrentMultiplier(msg.currentMultiplier);
        setCurrentWin(msg.currentWin);
        setOpenedCount(msg.openedCells.length);
        if (msg.status === 'active') {
          setPhase('playing');
          const newCells = cells.map(c => ({
            ...c,
            revealed: msg.openedCells.some((idx: number) => c.row * GRID_SIZE + c.col === idx),
            state: msg.openedCells.some((idx: number) => c.row * GRID_SIZE + c.col === idx) ? 'diamond' : 'hidden' as CellState,
          }));
          setCells(newCells);
        }
        if (msg.balance !== undefined) setBalance(msg.balance);
        break;
      case 'cell_revealed':
        handleCellRevealed(msg);
        break;
      case 'cashed_out':
        handleCashOutResult(msg);
        break;
    }
  }, [cells]);

  const handleCellRevealed = useCallback((msg: any) => {
    setAnimatingCell({ row: msg.row, col: msg.col });
    revealCellState(msg);
  }, [betAmount]);

  const handleCashOutResult = useCallback((msg: any) => {
    setShowAllMines(true);
    if (msg.allMines) {
      setCells(prev => {
        const n = [...prev];
        (msg.allMines as { row: number; col: number }[]).forEach(m => {
          const mi = m.row * GRID_SIZE + m.col;
          if (!n[mi].revealed) {
            n[mi] = { ...n[mi], state: 'mine', revealed: true };
          }
        });
        return n;
      });
    }
    if (msg.balance !== undefined) setBalance(msg.balance);
    setPhase('result');
    setResultType('win');
    setResultWinAmount(msg.winAmount);
    setResultMessage(`Ты выиграл ${msg.winAmount} ⭐ (x${msg.multiplier.toFixed(2)})`);
  }, []);

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
    if (user) setBalance(user.balance);
  }, [user]);

  const handleStartGame = async () => {
    if (betAmount < MIN_BET || betAmount > MAX_BET) {
      setError(`Ставка от ${MIN_BET} до ${MAX_BET} ⭐`);
      return;
    }
    if (balance < betAmount) {
      setShowDeposit(true);
      return;
    }

    setError(null);
    setShowAllMines(false);

    try {
      const result = await minesApi.start(betAmount, minesCount);
      if (!result.success) {
        if (result.error === 'INSUFFICIENT_BALANCE') { setShowDeposit(true); return; }
        if (result.error === 'CONCURRENT_GAME_EXISTS') { setError('Уже есть активная игра'); return; }
        setError(result.error || 'Ошибка старта игры');
        return;
      }

      setGameId(result.data.gameId);
      setServerSeedHash(result.data.serverSeedHash);
      if (result.data.balance !== undefined) setBalance(result.data.balance);
      setPhase('playing');
      setShowBetSheet(false);
      setCells(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
        state: 'hidden' as CellState,
        row: Math.floor(i / GRID_SIZE),
        col: i % GRID_SIZE,
        revealed: false,
      })));
      setOpenedCount(0);
      setCurrentMultiplier(1.0);
      setCurrentWin(0);
      setResultMessage(null);
      setResultType(null);
      setAllMines([]);
      setPulseLose(false);

      const nm = getCumulativeMultiplier(minesCount, 1);
      setNextMultiplier(nm);
    } catch (err) {
      console.error('[MINES] startGame error:', err);
      setError('Ошибка соединения');
    }
  };

  const revealCellState = (msg: any) => {
    const { row, col, type, multiplier, winAmount, openedCount: oc, game_over, status } = msg;

    if (type === 'mine') {
      setTimeout(() => {
        setCells(prev => {
          const next = [...prev];
          const idx = row * GRID_SIZE + col;
          next[idx] = { ...next[idx], state: 'mine', revealed: true };
          if (msg.allMines) {
            const mines = msg.allMines as { row: number; col: number }[];
            setTimeout(() => {
              setCells(prev2 => {
                const n2 = [...prev2];
                mines.forEach(m => {
                  const mi = m.row * GRID_SIZE + m.col;
                  if (!n2[mi].revealed) {
                    n2[mi] = { ...n2[mi], state: 'mine', revealed: true };
                  }
                });
                return n2;
              });
              setPulseLose(true);
              setTimeout(() => setPulseLose(false), 1500);
            }, 300);
          }
          return next;
        });
        setAnimatingCell(null);
        setPhase('result');
        setResultType('loss');
        setResultMessage(`Ты проиграл ${msg.lostAmount || betAmount} ⭐`);
      }, 400);
    } else {
      setTimeout(() => {
        setCells(prev => {
          const next = [...prev];
          const idx = row * GRID_SIZE + col;
          next[idx] = { ...next[idx], state: 'diamond', revealed: true };
          return next;
        });
        setAnimatingCell(null);
        setCurrentMultiplier(multiplier);
        setCurrentWin(winAmount);
        setOpenedCount(oc);
        if (msg.nextMultiplier) setNextMultiplier(msg.nextMultiplier);

        if (game_over) {
          setShowAllMines(true);
          if (msg.allMines) {
            setCells(prev => {
              const n = [...prev];
              (msg.allMines as { row: number; col: number }[]).forEach(m => {
                const mi = m.row * GRID_SIZE + m.col;
                if (!n[mi].revealed) {
                  n[mi] = { ...n[mi], state: 'mine', revealed: true };
                }
              });
              return n;
            });
          }
          setPhase('result');
          setResultType('win');
          setResultWinAmount(winAmount);
          setResultMessage(`Победа! ${winAmount} ⭐`);
        }
      }, 300);
    }
  };

  const handleReveal = async (row: number, col: number) => {
    if (phase !== 'playing' || !gameId || animatingCell) return;

    const idx = row * GRID_SIZE + col;
    if (cells[idx].revealed) return;

    setAnimatingCell({ row, col });

    try {
      const result = await minesApi.reveal(gameId, row, col);
      if (!result.success) {
        setAnimatingCell(null);
        if (result.error === 'GAME_NOT_ACTIVE') {
          setError('Игра уже завершена');
          setPhase('betting');
        }
        return;
      }
      revealCellState(result.data);
    } catch {
      setAnimatingCell(null);
      setError('Ошибка соединения');
    }
  };

  const handleCashOut = async () => {
    if (phase !== 'playing' || !gameId) return;

    try {
      const result = await minesApi.cashout(gameId);
      if (!result.success) {
        setError(result.error || 'Ошибка кэшаута');
        return;
      }
      const d = result.data;
      setCurrentMultiplier(d.multiplier);
      setCurrentWin(d.winAmount);
      setResultWinAmount(d.winAmount);
      if (d.balance !== undefined) setBalance(d.balance);
      refreshBalance();

      if (d.allMines) {
        setCells(prev => {
          const n = [...prev];
          (d.allMines as { row: number; col: number }[]).forEach(m => {
            const mi = m.row * GRID_SIZE + m.col;
            if (!n[mi].revealed) {
              n[mi] = { ...n[mi], state: 'mine', revealed: true };
            }
          });
          return n;
        });
      }
      setPhase('result');
      setResultType('win');
      setResultMessage(`Ты выиграл ${d.winAmount} ⭐ (x${d.multiplier.toFixed(2)})`);
    } catch {
      setError('Ошибка соединения');
    }
  };

  const handleNewGame = () => {
    setPhase('betting');
    setGameId(null);
    setServerSeedHash(null);
    setCells(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      state: 'hidden' as CellState, row: Math.floor(i / GRID_SIZE), col: i % GRID_SIZE, revealed: false,
    })));
    setOpenedCount(0);
    setCurrentMultiplier(1.0);
    setCurrentWin(0);
    setResultMessage(null);
    setResultType(null);
    setAllMines([]);
    setPulseLose(false);
    setShowAllMines(false);
    setError(null);
    refreshBalance();
  };

  const mines = minesCount;
  const safeCells = 25 - mines;
  const maxMultiplier = getMaxMultiplier(minesCount);
  const potentialWin = Math.floor(betAmount * maxMultiplier);
  const nextWin = phase === 'playing' || phase === 'result'
    ? Math.max(currentWin, resultWinAmount)
    : Math.floor(betAmount * getCumulativeMultiplier(minesCount, 1));

  return (
    <div className={`mines${pulseLose ? ' mines--lose-pulse' : ''}`}>
      <div className="mines__top-bar">
        <button className="mines__back-btn" onClick={() => navigate('/play')}>← Назад</button>
      </div>

      <div className="mines__top-panel">
        <div className="mines__panel-left" ref={minesDropdownRef}>
          <button
            className={`mines__dropdown-trigger${phase !== 'betting' ? ' mines__dropdown-trigger--disabled' : ''}`}
            onClick={() => phase === 'betting' && setMinesDropdownOpen(!minesDropdownOpen)}
            disabled={phase !== 'betting'}
          >
            <span className="mines__dropdown-label">Mines: {minesCount}</span>
            <span className="mines__dropdown-arrow">▼</span>
          </button>
          {minesDropdownOpen && (
            <div className="mines__dropdown-menu">
              {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                <div
                  key={n}
                  className={`mines__dropdown-item${n === minesCount ? ' mines__dropdown-item--active' : ''}`}
                  onClick={() => { setMinesCount(n); setMinesDropdownOpen(false); }}
                >{n}</div>
              ))}
            </div>
          )}
        </div>
        <div className="mines__panel-right">
          <div className="mines__next-badge">
            Next: x{(phase === 'playing' || phase === 'result' ? nextMultiplier || currentMultiplier : getCumulativeMultiplier(minesCount, 1)).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mines__content">
        <div className="mines__grid-wrapper">
          <div className={`mines__grid${phase === 'playing' ? ' mines__grid--active' : ''}`}>
            {cells.map((cell, i) => (
              <div
                key={i}
                className={`
                  mines__cell
                  ${cell.revealed ? (cell.state === 'diamond' ? 'mines__cell--diamond' : 'mines__cell--mine') : 'mines__cell--hidden'}
                  ${phase === 'playing' && !cell.revealed && !animatingCell ? 'mines__cell--clickable' : ''}
                  ${animatingCell?.row === cell.row && animatingCell?.col === cell.col ? 'mines__cell--animating' : ''}
                `}
                onClick={() => handleReveal(cell.row, cell.col)}
              >
                {cell.revealed ? (
                  cell.state === 'diamond' ? (
                    <span className="mines__cell-icon">💎</span>
                  ) : (
                    <span className="mines__cell-icon">💣</span>
                  )
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mines__side-panel">
          {phase === 'betting' && (
            <div className="mines__controls">
              <button className="mines__action-btn" onClick={() => setShowBetSheet(true)}>
                Сделать ставку
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="mines__playing">
              <button
                className={`mines__action-btn mines__cashout-btn${openedCount === 0 ? ' mines__action-btn--disabled' : ''}`}
                onClick={handleCashOut}
                disabled={openedCount === 0}
              >
                Забрать {currentWin} ⭐
              </button>
            </div>
          )}

          {phase === 'result' && (
            <div className="mines__result">
              {serverSeedHash && (
                <div className="mines__fair">
                  <span className="mines__fair-label">Provably Fair</span>
                  <span className="mines__fair-hash" title={serverSeedHash}>
                    {serverSeedHash.slice(0, 12)}...
                  </span>
                </div>
              )}
              <div className={`mines__result-message ${resultType === 'win' ? 'mines__result-message--win' : 'mines__result-message--lose'}`}>
                {resultMessage}
              </div>
              {resultType === 'win' && resultWinAmount > 0 && (
                <div className="mines__result-amount">{resultWinAmount} ⭐</div>
              )}
              <button className="mines__action-btn" onClick={handleNewGame}>
                Играть снова
              </button>
            </div>
          )}
        </div>
      </div>

      <MinesBetSheet
        isOpen={showBetSheet}
        onClose={() => setShowBetSheet(false)}
        betAmount={betAmount}
        onBetAmountChange={setBetAmount}
        balance={balance}
        minesCount={minesCount}
        error={error}
        onStartGame={handleStartGame}
        onDeposit={() => setShowDeposit(true)}
      />

      <DepositModal
        isOpen={showDeposit}
        onClose={() => setShowDeposit(false)}
        onDepositSuccess={(amount) => { addBalance(amount); refreshBalance(); setShowDeposit(false); }}
      />
    </div>
  );
}

export default Mines;
