import { useState, useEffect, useRef, type FC } from 'react';
import './MinesBetSheet.css';

const BET_PRESETS = [10, 25, 50, 100, 250];
const MAX_BET = 10000;

interface MinesBetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  balance: number;
  minesCount: number;
  error: string | null;
  onStartGame: () => void;
  onDeposit: () => void;
}

export const MinesBetSheet: FC<MinesBetSheetProps> = ({
  isOpen,
  onClose,
  betAmount,
  onBetAmountChange,
  balance,
  minesCount,
  error,
  onStartGame,
  onDeposit,
}) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [betDropdownOpen, setBetDropdownOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const draggingRef = useRef(false);
  const betDropdownRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    setVisible(true);
    setClosing(false);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose();
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      handleOpen();
    } else {
      if (visible) handleClose();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!betDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (betDropdownRef.current && !betDropdownRef.current.contains(e.target as Node)) {
        setBetDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [betDropdownOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff < 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const diff = currentYRef.current - startYRef.current;
    if (diff < -100) {
      handleClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    currentYRef.current = 0;
  };

  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    draggingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      currentYRef.current = ev.clientY;
      const diff = currentYRef.current - startYRef.current;
      if (diff < 0 && sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      const diff = currentYRef.current - startYRef.current;
      if (diff < -100) {
        handleClose();
      } else if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      currentYRef.current = 0;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleBetClick = (n: number) => {
    onBetAmountChange(Math.min(MAX_BET, n));
    setBetDropdownOpen(false);
  };

  if (!visible) return null;

  return (
    <div className={`mines-bet__overlay ${closing ? 'mines-bet__overlay--closing' : ''}`} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={`mines-bet__sheet ${closing ? 'mines-bet__sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mines-bet__drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleDragHandleMouseDown}
        >
          <span className="mines-bet__drag-bar" />
        </div>

        <div className="mines-bet__header">
          <h2 className="mines-bet__title">Сумма ставки</h2>
          <button className="mines-bet__close" onClick={handleClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="mines-bet__content">
          <div className="mines-bet__info">
            <span>Баланс: {balance} ⭐</span>
            <span>Мины: {minesCount}</span>
          </div>

          <div className="mines-bet__control-group">
            <label className="mines-bet__label">Сумма ставки</label>
            <div className="mines-bet__row" ref={betDropdownRef}>
              <button
                className="mines-bet__trigger"
                onClick={() => setBetDropdownOpen(!betDropdownOpen)}
              >
                <span className="mines-bet__bet-label">{betAmount} ⭐</span>
                <span className="mines-bet__arrow">▼</span>
              </button>
              {betDropdownOpen && (
                <div className="mines-bet__dropdown-menu">
                  {[1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 500, 1000, 2500, 5000].map(n => (
                    <div
                      key={n}
                      className={`mines-bet__dropdown-item${betAmount === n ? ' mines-bet__dropdown-item--active' : ''}`}
                      onClick={() => handleBetClick(n)}
                    >{n} ⭐</div>
                  ))}
                </div>
              )}
            </div>
            <div className="mines-bet__presets">
              {BET_PRESETS.map(p => (
                <button
                  key={p}
                  className={`mines-bet__preset-btn${betAmount === p ? ' mines-bet__preset-btn--active' : ''}`}
                  onClick={() => {
                    if (p > balance) { onDeposit(); return; }
                    onBetAmountChange(p);
                  }}
                >{p}</button>
              ))}
              <button
                className="mines-bet__preset-btn"
                onClick={() => onBetAmountChange(balance)}
              >Max</button>
            </div>
          </div>

          {error && <div className="mines-bet__error">{error}</div>}

          <button className="mines-bet__submit" onClick={onStartGame}>
            Сделать ставку {betAmount} ⭐
          </button>
        </div>
      </div>
    </div>
  );
};
