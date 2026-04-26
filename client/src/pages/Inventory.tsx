import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { winApi } from '../services/api';
import { GiftImage } from '../components/GiftAnimation';
import { GiftReceiveModal } from '../components/GiftReceiveModal';
import './Inventory.css';

export function Inventory() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<{
    id: number;
    gift_id: string;
    gift_name: string;
    gift_stars: number;
    animationSvg?: string;
    animationData?: any;
  } | null>(null);
  const navigate = useNavigate();

  const loadGifts = async () => {
    setLoading(true);
    try {
      const response = await winApi.getMy();
      if (response.success) setGifts(response.data?.gifts || []);
    } catch (err) {
      console.error('Failed to load gifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGifts();
  }, []);

  const totalStars = gifts.reduce((sum, g) => sum + (g.gift_stars || 0), 0);

  return (
    <div className="inventory">
      <div className="inventory__header">
        <h1 className="inventory__title">Инвентарь</h1>
        <p className="inventory__subtitle">Твои выигранные подарки</p>
      </div>

      <div className="inventory__stats">
        <div className="inventory__stat">
          <span className="inventory__stat-icon">🎁</span>
          <div className="inventory__stat-info">
            <span className="inventory__stat-value">{gifts.length}</span>
            <span className="inventory__stat-label">подарков</span>
          </div>
        </div>
        <div className="inventory__stat">
          <span className="inventory__stat-icon">⭐</span>
          <div className="inventory__stat-info">
            <span className="inventory__stat-value">{totalStars.toLocaleString()}</span>
            <span className="inventory__stat-label">всего Stars</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="inventory__loading">
          <div className="inventory__loading-spinner" />
        </div>
      ) : gifts.length === 0 ? (
        <div className="inventory__empty">
          <div className="inventory__empty-icon">🎁</div>
          <h3 className="inventory__empty-title">Пусто</h3>
          <p className="inventory__empty-text">У тебя пока нет подарков</p>
          <button 
            className="inventory__empty-action"
            onClick={() => navigate('/play')}
          >
            Крутить рулетку
          </button>
        </div>
      ) : (
        <div className="inventory__section">
          <h2 className="inventory__section-title">Мои подарки</h2>
          <div className="inventory__grid">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="inventory__gift"
                onClick={() => setSelectedGift(gift)}
              >
                <div className="inventory__gift-image">
                  {gift.animationSvg ? (
                    <GiftImage svgContent={gift.animationSvg} size={60} uniqueId={`inv-${gift.id}`} />
                  ) : (
                    <span className="inventory__gift-emoji">🎁</span>
                  )}
                </div>
                <div className="inventory__gift-info">
                  <span className="inventory__gift-name">{gift.gift_name}</span>
                  <span className="inventory__gift-stars">⭐ {gift.gift_stars}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GiftReceiveModal
        isOpen={!!selectedGift}
        gift={selectedGift}
        onClose={() => setSelectedGift(null)}
        onSend={async () => {
          if (!selectedGift) return;
          await winApi.send(selectedGift.id);
        }}
        onSuccess={loadGifts}
      />
    </div>
  );
}

export default Inventory;