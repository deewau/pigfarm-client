import { GiftImage } from '../components/GiftAnimation';
import './ResultModal.css';

interface ResultModalProps {
  animationSvg?: string;
  giftId?: string;
  onClose: () => void;
  onDisableDemo?: () => void;
  isDemo?: boolean;
  onGoToProfile?: () => void;
}

export function ResultModal({ 
  animationSvg,
  giftId,
  onClose, 
  onDisableDemo, 
  isDemo = true,
  onGoToProfile 
}: ResultModalProps) {
  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="result-modal__gift">
          <GiftImage 
            svgContent={animationSvg} 
            giftId={giftId}
            size={200}
            fallbackEmoji="🎁"
          />
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
