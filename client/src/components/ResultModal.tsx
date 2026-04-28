import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import './ResultModal.css';

interface ResultModalProps {
  animationData: any;
  onClose: () => void;
  onDisableDemo?: () => void;
  isDemo?: boolean;
  onGoToProfile?: () => void;
  isSpecial?: boolean;
}

export function ResultModal({ 
  animationData, 
  onClose, 
  onDisableDemo, 
  isDemo = true,
  onGoToProfile,
  isSpecial = false
}: ResultModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !animationData) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });

    return () => animation.destroy();
  }, [animationData]);

  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className={`result-modal${isSpecial ? ' result-modal--special' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="result-modal__gift" ref={containerRef} />
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
