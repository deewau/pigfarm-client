import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import { GiftImage } from './GiftAnimation';
import './GiftInfoModal.css';

interface GiftInfoModalProps {
  gift: {
    id: string;
    name: string;
    stars: number;
    animationSvg?: string;
    animationData?: any;
    isSpecial?: boolean;
    isVirt?: boolean;
  };
  onClose: () => void;
}

export function GiftInfoModal({ gift, onClose }: GiftInfoModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !gift.animationData) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: gift.animationData,
    });

    return () => animation.destroy();
  }, [gift.animationData]);

  const isVirt = gift.isVirt;
  const isSpecial = gift.isSpecial;

  return (
    <div className="gift-info-overlay" onClick={onClose}>
      <div 
        className={`gift-info-modal${isVirt ? ' gift-info-modal--virt' : ''}${isSpecial ? ' gift-info-modal--special' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gift-info__animation">
          {gift.animationData ? (
            <div ref={containerRef} />
          ) : (
            <GiftImage giftId={gift.id} size={150} />
          )}
        </div>
        <h3 className="gift-info__title">
          {isVirt ? 'VIRT' : (isSpecial ? 'NFT' : 'Подарок')} — {gift.name}
        </h3>
        <p className="gift-info__description">
          {isVirt 
            ? 'VIRT-валюта, которая будет начислена вам на баланс при выигрыше.'
            : isSpecial 
              ? 'Это коллекционный NFT-подарок, повышайте ставку, чтобы повысить шанс его выпадения.'
              : `Подарок стоимостью ${gift.stars} ⭐`
          }
        </p>
        <button className="gift-info__close-btn" onClick={onClose}>
          Понятно
        </button>
      </div>
    </div>
  );
}
