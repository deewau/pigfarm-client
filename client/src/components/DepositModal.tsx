import { useState, useEffect, useRef, type FC } from 'react';
import { depositApi } from '../services/api';
import './DepositModal.css';

const PRESETS = [25, 50, 100, 250, 500, 1000, 2500, 10000];
const MAX_STARS = 10000;

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess?: () => void;
}

export const DepositModal: FC<DepositModalProps> = ({ isOpen, onClose, onDepositSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [amount, setAmount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorFading, setErrorFading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const draggingRef = useRef(false);

  const handleOpen = () => {
    setVisible(true);
    setClosing(false);
    setAmount(25);
    setError(null);
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

  // Автоматическое скрытие ошибки через 2 секунды
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setErrorFading(true);
        setTimeout(() => {
          setError(null);
          setErrorFading(false);
        }, 400);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    draggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 100) {
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
      if (diff > 0 && sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      const diff = currentYRef.current - startYRef.current;
      if (diff > 100) {
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

  const handlePresetClick = (value: number) => {
    setAmount(value);
    setError(null);
  };

  const handleMaxClick = () => {
    setAmount(MAX_STARS);
    setError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setAmount(Math.min(Math.max(value, 1), MAX_STARS));
    } else {
      setAmount(0);
    }
    setError(null);
  };

  const handleDeposit = async () => {
    if (amount < 1 || amount > MAX_STARS) {
      setError('Недопустимая сумма');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await depositApi.create(amount, `Пополнение на ${amount} звёзд`);

      if (response.success && response.data) {
        const { invoiceUrl } = response.data;

        // Открываем invoice в Telegram
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.openInvoice(invoiceUrl, (status: string) => {
            console.log('Invoice status:', status);
            if (status === 'paid') {
              onDepositSuccess?.();
              handleClose();
            } else if (status === 'failed' || status === 'cancelled') {
              setError('Платёж не был завершён');
            }
          });
        } else {
          // Для тестирования в браузере
          window.open(invoiceUrl, '_blank');
          setError('Открыли invoice в новой вкладке (для Telegram WebApp откроется автоматически)');
        }
      } else {
        setError(response.error || 'Не удалось создать платёж');
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.error || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className={`deposit-modal__overlay ${closing ? 'deposit-modal__overlay--closing' : ''}`} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={`deposit-modal__sheet ${closing ? 'deposit-modal__sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="deposit-modal__drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleDragHandleMouseDown}
        >
          <span className="deposit-modal__drag-bar" />
        </div>

        <div className="deposit-modal__header">
          <h2 className="deposit-modal__title">Пополнение баланса</h2>
          <button className="deposit-modal__close" onClick={handleClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="deposit-modal__content">
          {/* Табы */}
          <div className="deposit-modal__tabs">
            <button className="deposit-modal__tab deposit-modal__tab--active">Stars</button>
            <button className="deposit-modal__tab deposit-modal__tab--disabled">Купить Stars</button>
          </div>

          {/* Ввод суммы */}
          <div className="deposit-modal__amount-section">
            <label className="deposit-modal__label">Введите сумму в звездах:</label>
            <div className="deposit-modal__input-row">
              <div className="deposit-modal__input-wrapper">
                <span className="deposit-modal__input-icon">⭐</span>
                <input
                  type="number"
                  className="deposit-modal__input"
                  value={amount}
                  onChange={handleAmountChange}
                  min={1}
                  max={MAX_STARS}
                />
              </div>
              <button className="deposit-modal__max-btn" onClick={handleMaxClick}>
                Макс
              </button>
            </div>
            <span className="deposit-modal__hint">Вы получите {amount}💎</span>
          </div>

          {/* Пресеты */}
          <div className="deposit-modal__presets">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                className={`deposit-modal__preset ${amount === preset ? 'deposit-modal__preset--active' : ''}`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset} ⭐
              </button>
            ))}
          </div>

          {/* Ошибка */}
          {error && (
            <div className={`deposit-modal__error ${errorFading ? 'deposit-modal__error--fading' : ''}`}>
              {error}
            </div>
          )}

          {/* Кнопка пополнить */}
          <button
            className="deposit-modal__submit"
            onClick={handleDeposit}
            disabled={loading || amount < 1}
          >
            {loading ? 'Создание платежа...' : 'Пополнить'}
          </button>

          <p className="deposit-modal__terms">
            Пополняя баланс вы соглашаетесь с <a href="#">правилами</a>
          </p>
        </div>
      </div>
    </div>
  );
};
