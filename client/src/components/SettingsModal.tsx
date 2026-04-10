import { useEffect, useRef, useState, type FC } from 'react';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const draggingRef = useRef(false);

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

  if (!visible) return null;

  return (
    <div className={`settings-modal__overlay ${closing ? 'settings-modal__overlay--closing' : ''}`} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={`settings-modal__sheet ${closing ? 'settings-modal__sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="settings-modal__drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleDragHandleMouseDown}
        >
          <span className="settings-modal__drag-bar" />
        </div>

        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Настройки</h2>
          <button className="settings-modal__close" onClick={handleClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="settings-modal__content">
          {/* Приватность */}
          <section className="settings-section">
            <h3 className="settings-section__title">Приватность</h3>
            <div className="settings-section__options">
              <button className="settings-option">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c0 5.52 4.48 10 10 10 3.13 0 6.1-1.47 8.02-3.98l2.28 2.28.7-.7L4.75 2.32l-.46-.46L2 4.27zM10 15H8v-2h2v2zm0-4H8V7h2v4z" />
                </svg>
                <span>Скрыт</span>
              </button>
              <button className="settings-option settings-option--active">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>Имя</span>
              </button>
              <button className="settings-option">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                <span>Публич.</span>
              </button>
            </div>
          </section>

          {/* Язык */}
          <section className="settings-section">
            <h3 className="settings-section__title">Язык</h3>
            <div className="settings-section__grid">
              <button className="settings-lang settings-lang--active">🇷🇺 Русский</button>
              <button className="settings-lang">🇺 Українська</button>
              <button className="settings-lang">🇬🇧 English</button>
              <button className="settings-lang">🇧🇷 Português</button>
              <button className="settings-lang">🇪🇸 Español</button>
              <button className="settings-lang">🇨🇳 中文</button>
              <button className="settings-lang">🇮🇳 हिन्दी</button>
              <button className="settings-lang">🇮 Indonesia</button>
              <button className="settings-lang">🇸🇦 العربية</button>
            </div>
          </section>

          {/* Тема */}
          <section className="settings-section">
            <h3 className="settings-section__title">Тема</h3>
            <div className="settings-section__options">
              <button className="settings-option settings-option--active">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
                <span>Тёмная</span>
              </button>
              <button className="settings-option">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
                </svg>
                <span>Светлая</span>
              </button>
            </div>
          </section>

          {/* Тактильный отклик */}
          <section className="settings-section">
            <h3 className="settings-section__title">Тактильный отклик</h3>
            <div className="settings-section__options settings-section__options--haptic">
              <button className="settings-option settings-option--haptic">Выкл</button>
              <button className="settings-option settings-option--haptic settings-option--active">Light</button>
              <button className="settings-option settings-option--haptic">Soft</button>
              <button className="settings-option settings-option--haptic">Medium</button>
              <button className="settings-option settings-option--haptic">Heavy</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
