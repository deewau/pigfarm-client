import './ResultModal.css';

interface ResultModalProps {
  giftSvg: string;
  onClose: () => void;
  onDisableDemo: () => void;
}

export function ResultModal({ giftSvg, onClose, onDisableDemo }: ResultModalProps) {
  return (
    <div className="result-modal-overlay" onClick={onClose}>
      <div className="result-modal" onClick={(e) => e.stopPropagation()}>
        <div className="result-modal__header">
          <span className="result-modal__title">Случайный подарок</span>
          <button className="result-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="result-modal__content">
          <div
            className="result-modal__gift"
            dangerouslySetInnerHTML={{ __html: giftSvg }}
          />
          <h2 className="result-modal__message">Вы выиграли подарок!</h2>
          <p className="result-modal__description">
            Демо-режим нужен для тестирования<br />шансов выпадения подарков.
          </p>
        </div>

        <div className="result-modal__actions">
          <button className="result-modal__btn result-modal__btn--secondary" onClick={onDisableDemo}>
            Отключить демо-режим
          </button>
          <button className="result-modal__btn result-modal__btn--primary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
