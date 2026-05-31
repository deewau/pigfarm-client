import { useState, useEffect, useRef, type FC } from 'react';
import { winApi } from '../services/api';
import { GiftImage } from './GiftAnimation';
import './GiftBetSheet.css';

export interface GiftItem {
  id: number;
  gift_id: string;
  gift_name: string;
  gift_stars: number;
  animationSvg?: string;
  animationData?: any;
}

interface GiftBetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gift: GiftItem) => void;
}

export const GiftBetSheet: FC<GiftBetSheetProps> = ({ isOpen, onClose, onSelect }) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    if (!isOpen || !visible) return;
    setLoading(true);
    winApi.getMy()
      .then(res => {
        if (res.success) setGifts(res.data?.gifts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, visible]);

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

  if (!visible) return null;

  return (
    <div className={`gift-bet__overlay ${closing ? 'gift-bet__overlay--closing' : ''}`} onClick={handleClose}>
      <div
        ref={sheetRef}
        className={`gift-bet__sheet ${closing ? 'gift-bet__sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="gift-bet__drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleDragHandleMouseDown}
        >
          <span className="gift-bet__drag-bar" />
        </div>

        <div className="gift-bet__header">
          <h2 className="gift-bet__title">Выбери подарок для ставки</h2>
          <button className="gift-bet__close" onClick={handleClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="gift-bet__content">
          {loading ? (
            <div className="gift-bet__loading">
              <div className="gift-bet__loading-spinner" />
            </div>
          ) : gifts.length === 0 ? (
            <div className="gift-bet__empty">
              <p>У тебя нет подарков для ставки</p>
            </div>
          ) : (
            <div className="gift-bet__grid">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className="gift-bet__item"
                  onClick={() => {
                    onSelect(gift);
                    handleClose();
                  }}
                >
                  <div className="gift-bet__item-image">
                    {gift.animationSvg ? (
                      <GiftImage svgContent={gift.animationSvg} size={52} uniqueId={`gb-${gift.id}`} />
                    ) : (
                      <span className="gift-bet__item-emoji">🎁</span>
                    )}
                  </div>
                  <div className="gift-bet__item-name">{gift.gift_name}</div>
                  <div className="gift-bet__item-stars">⭐ {gift.gift_stars}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftBetSheet;