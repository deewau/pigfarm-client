import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
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
    if (!containerRef.current) return;

    let animation: any = null;

    // Загружаем анимацию (Vite проксирует /gifts на сервер)
    const loadAnimation = async () => {
      try {
        const response = await fetch(`/gifts/${gift.id}.json`);
        if (response.ok) {
          const data = await response.json();
          if (containerRef.current) {
            animation = lottie.loadAnimation({
              container: containerRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: data,
            });
          }
        } else {
          console.error(`Failed to load animation: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to load animation:', error);
      }
    };

    loadAnimation();

    return () => {
      try {
        if (animation) animation.destroy();
      } catch (e) {}
    };
  }, [gift.id]);

  const isVirt = gift.isVirt;
  const isSpecial = gift.isSpecial;

  return (
    <div className="gift-info-overlay" onClick={onClose}>
      <div 
        className={`gift-info-modal${isVirt ? ' gift-info-modal--virt' : ''}${isSpecial ? ' gift-info-modal--special' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gift-info__animation">
          {gift.isVirt ? (
            <GiftImage giftId="virt" size={150} fallbackEmoji="🎁" />
          ) : (
            <div ref={containerRef} />
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
