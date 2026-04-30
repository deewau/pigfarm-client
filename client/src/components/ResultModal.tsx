import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import { GiftImage } from './GiftAnimation';
import './ResultModal.css';

interface ResultModalProps {
  animationData?: any;
  animationSvg?: string;
  giftId?: string;
  onClose: () => void;
  onDisableDemo?: () => void;
  isDemo?: boolean;
  onGoToProfile?: () => void;
  isSpecial?: boolean;
  isVirt?: boolean;
}

export function ResultModal({ 
  animationData, 
  animationSvg,
  giftId,
  onClose, 
  onDisableDemo, 
  isDemo = true,
  onGoToProfile,
  isSpecial = false,
  isVirt = false
}: ResultModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!animationData) {
      // Показываем SVG-превью, если нет анимации
      return;
    }
    
    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    
    return () => animation.destroy();
  }, [animationData]);

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className={`result-modal${isSpecial ? ' result-modal--special' : ''}${isVirt ? ' result-modal--virt' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="result-modal__gift" ref={containerRef}>
          {!animationData && (animationSvg || giftId) && (
            <GiftImage svgContent={animationSvg} giftId={giftId} size={200} />
          )}
        </div>
        <h2 className="result-modal__message">
          {isDemo ? 'Вы выиграли подарок!' : '🎉 Поздравляем!'}
        </h2>
        <p className="result-modal__description">
          {isDemo 
            ? 'Демо-режим нужен для тестирования\nшансов выпадения подарков.'
            : 'Вы можете ознакомиться со своим\nподарком в профиле!'
          }
        </p>
        <div className="result-modal__actions">
          {isDemo && onDisableDemo && (
            <button className="result-modal__btn result-modal__btn--secondary" onClick={onDisableDemo}>
              Отключить демо-режим
            </button>
          )}
          {!isDemo && onGoToProfile && (
            <button className="result-modal__btn result-modal__btn--secondary" onClick={onGoToProfile}>
              Перейти в профиль
            </button>
          )}
          <button className="result-modal__btn result-modal__btn--primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}