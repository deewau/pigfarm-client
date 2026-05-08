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
        <div className="play__cases-block" onClick={() => navigate('/play/cases')}>
          <div className="play__cases-block-content">
            <span className="play__cases-block-title">Кейсы</span>
            <button className="play__cases-block-btn" onClick={(e) => { e.stopPropagation(); navigate('/play/cases'); }}>Играть →</button>
          </div>
        </div>

        <div className="play__lobby-card play__lobby-card--disabled">
          <span className="play__lobby-card-emoji">✈️</span>
          <span className="play__lobby-card-title">Авиатор</span>
          <span className="play__lobby-card-desc">Скоро...</span>
        </div>
      </div>
    </div>
  );
}
