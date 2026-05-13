import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { minesApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { DepositModal } from '../components/DepositModal';
import './Mines.css';

const GRID_SIZE = 5;
const MINES_PRESETS = [1, 3, 5, 10, 15, 20, 24];
const BET_PRESETS = [10, 25, 50, 100, 250];
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
  const remainingMines = Math.max(0, minesCount - openedCount);
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

  return (
    <div className={`mines${pulseLose ? ' mines--lose-pulse' : ''}`}>
      <div className="mines__top-bar">
        <button className="mines__back-btn" onClick={() => navigate('/play')}>← Назад</button>
        <span className="mines__title">Mines</span>
        <div className="mines__balance">{balance} ⭐</div>
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
                  ${showAllMines && !cell.revealed && cells.some((_, j) => {
                    const isMine = allMines.some(m => m.row === cell.row && m.col === cell.col);
                    return false;
                  }) ? 'mines__cell--show-mine' : ''}
                `}
                onClick={() => handleReveal(cell.row, cell.col)}
              >
                {cell.revealed ? (
                  cell.state === 'diamond' ? (
                    <span className="mines__cell-icon">💎</span>
                  ) : (
                    <span className="mines__cell-icon">💣</span>
                  )
                ) : (
                  phase === 'betting' && <span className="mines__cell-question">?</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mines__side-panel">
          {phase === 'betting' && (
            <div className="mines__controls">
              <div className="mines__control-group">
                <label className="mines__label">Количество мин</label>
                <div className="mines__mines-selector">
                  <button
                    className="mines__mines-btn"
                    onClick={() => setMinesCount(Math.max(1, minesCount - 1))}
                    disabled={minesCount <= 1}
                  >−</button>
                  <span className="mines__mines-value">{minesCount}</span>
                  <button
                    className="mines__mines-btn"
                    onClick={() => setMinesCount(Math.min(24, minesCount + 1))}
                    disabled={minesCount >= 24}
                  >+</button>
                </div>
                <div className="mines__presets">
                  {MINES_PRESETS.map(p => (
                    <button
                      key={p}
                      className={`mines__preset-btn${minesCount === p ? ' mines__preset-btn--active' : ''}`}
                      onClick={() => setMinesCount(p)}
                    >{p}</button>
                  ))}
                </div>
              </div>

              <div className="mines__info-row">
                <span className="mines__info-label">Безопасно</span>
                <span className="mines__info-value">{safeCells}/25</span>
              </div>
              <div className="mines__info-row">
                <span className="mines__info-label">Макс. множитель</span>
                <span className="mines__info-value" style={{ color: '#FFD700' }}>x{maxMultiplier.toFixed(2)}</span>
              </div>

              <div className="mines__control-group">
                <label className="mines__label">Сумма ставки</label>
                <div className="mines__bet-input-row">
                  <button
                    className="mines__bet-btn"
                    onClick={() => setBetAmount(Math.max(MIN_BET, betAmount - 5))}
                    disabled={betAmount <= MIN_BET}
                  >−</button>
                  <input
                    type="number"
                    className="mines__bet-input"
                    value={betAmount}
                    onChange={e => {
                      const v = parseInt(e.target.value) || MIN_BET;
                      setBetAmount(Math.min(MAX_BET, Math.max(MIN_BET, v)));
                    }}
                    min={MIN_BET}
                    max={MAX_BET}
                  />
                  <button
                    className="mines__bet-btn"
                    onClick={() => setBetAmount(Math.min(MAX_BET, betAmount + 5))}
                    disabled={betAmount >= MAX_BET}
                  >+</button>
                </div>
                <div className="mines__presets">
                  {BET_PRESETS.map(p => (
                    <button
                      key={p}
                      className={`mines__preset-btn${betAmount === p ? ' mines__preset-btn--active' : ''}`}
                      onClick={() => {
                        if (p > balance) { setShowDeposit(true); return; }
                        setBetAmount(p);
                      }}
                    >{p}</button>
                  ))}
                  <button
                    className="mines__preset-btn"
                    onClick={() => setBetAmount(balance)}
                  >Max</button>
                </div>
              </div>

              <div className="mines__info-row">
                <span className="mines__info-label">К выигрышу</span>
                <span className="mines__info-value" style={{ color: '#4CAF50' }}>{potentialWin.toLocaleString()} ⭐</span>
              </div>

              {error && <div className="mines__error">{error}</div>}

              <button
                className="mines__action-btn"
                onClick={handleStartGame}
                disabled={betAmount < MIN_BET || betAmount > MAX_BET}
              >
                Сделать ставку {betAmount} ⭐
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="mines__playing">
              <div className="mines__stats">
                <div className="mines__stat-item">
                  <span className="mines__stat-label">Множитель</span>
                  <span className="mines__stat-value" style={{ color: currentMultiplier > 1 ? '#4CAF50' : '#fff' }}>
                    x{currentMultiplier.toFixed(4)}
                  </span>
                </div>
                {nextMultiplier > 0 && (
                  <div className="mines__stat-item">
                    <span className="mines__stat-label">Следующий</span>
                    <span className="mines__stat-value" style={{ color: '#888' }}>x{nextMultiplier.toFixed(4)}</span>
                  </div>
                )}
                <div className="mines__stat-item">
                  <span className="mines__stat-label">Выигрыш</span>
                  <span className="mines__stat-value" style={{ color: '#4CAF50' }}>
                    {currentWin} ⭐
                  </span>
                </div>
                <div className="mines__stat-item">
                  <span className="mines__stat-label">Открыто</span>
                  <span className="mines__stat-value">{openedCount}/{25 - minesCount}</span>
                </div>
              </div>

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

      <DepositModal
        isOpen={showDeposit}
        onClose={() => setShowDeposit(false)}
        onDepositSuccess={(amount) => { addBalance(amount); refreshBalance(); setShowDeposit(false); }}
      />
    </div>
  );
}

export default Mines;
