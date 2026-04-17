import { useEffect, useRef, useState, type FC } from 'react';
import lottie from 'lottie-web';
import { GiftImage } from '../components/GiftAnimation';
import './GiftReceiveModal.css';

interface GiftReceiveModalProps {
  isOpen: boolean;
  gift: {
    id: number;
    gift_id: string;
    gift_name: string;
    gift_stars: number;
    animationSvg?: string;
    animationData?: any;
  } | null;
  onClose: () => void;
  onSend: () => void;
  onSuccess?: () => void;
}

export const GiftReceiveModal: FC<GiftReceiveModalProps> = ({ isOpen, gift, onClose, onSend, onSuccess }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !gift?.animationData) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: gift.animationData,
    });

    return () => animation.destroy();
  }, [gift?.animationData]);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend();
      setSent(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to send gift:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !gift) return null;

  return (
    <div className="gift-receive-modal-overlay" onClick={onClose}>
      <div className="gift-receive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gift-receive-modal__gift">
          {gift.animationSvg ? (
            <GiftImage svgContent={gift.animationSvg} size={120} uniqueId={`gift-receive-${gift.id}`} />
          ) : (
            <div className="gift-receive-modal__emoji">🎁</div>
          )}
        </div>
        
        <h2 className="gift-receive-modal__title">{gift.gift_name}</h2>
        
        <p className="gift-receive-modal__value">{gift.gift_stars} ⭐</p>
        
        <p className="gift-receive-modal__desc">
          {sent 
            ? 'Подарок отправлен!' 
            : 'Вы можете отправить этот подарок себе в Telegram'
          }
        </p>
        
        <div className="gift-receive-modal__actions">
          {sent ? (
            <button 
              className="gift-receive-modal__btn gift-receive-modal__btn--primary" 
              onClick={onClose}
            >
              Закрыть
            </button>
          ) : (
            <button 
              className="gift-receive-modal__btn gift-receive-modal__btn--primary" 
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Отправка...' : 'Получить подарок'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftReceiveModal;