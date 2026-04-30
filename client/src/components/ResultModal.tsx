import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import './ResultModal.css';

interface ResultModalProps {
  animationData?: any;
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
    
    // Для VIRT-подарков используем запасной вариант
    if (isVirt) {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#9B59B6"/><text x="50" y="55" text-anchor="middle" fill="#fff" font-size="20">VIRT</text></svg>`;
      const animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: null,
      });
      containerRef.current.innerHTML = svgContent;
      return () => animation.destroy();
    }
    
    if (!animationData) return;
    
    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    
    return () => animation.destroy();
  }, [animationData, isVirt]);

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
