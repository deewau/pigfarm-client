import { useNavigate } from 'react-router-dom';
import { LiveFeed } from '../components/LiveFeed';
import { useLiveFeed } from '../contexts/LiveFeedContext';
import './Play.css';

export function Play() {
  const navigate = useNavigate();
  const { liveWins, sliding } = useLiveFeed();

  return (
    <div className="play play--lobby">
      <LiveFeed wins={liveWins} sliding={sliding} />

      <div className="play__lobby-grid">
        <div className="play__lobby-card" onClick={() => navigate('/play/cases')}>
          <span className="play__lobby-card-emoji">🎰</span>
          <span className="play__lobby-card-title">Кейсы</span>
          <span className="play__lobby-card-desc">Рулетка с подарками</span>
        </div>
        
        {/* Сюда в будущем добавим Авиатор и другие игры */}
        <div className="play__lobby-card play__lobby-card--disabled">
          <span className="play__lobby-card-emoji">✈️</span>
          <span className="play__lobby-card-title">Авиатор</span>
          <span className="play__lobby-card-desc">Скоро...</span>
        </div>
      </div>
    </div>
  );
}
