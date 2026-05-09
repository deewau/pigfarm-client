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
          <img src="/gifts/svg/pepecase.svg" alt="Кейсы" className="play__cases-block-img" />
          <div className="play__cases-block-content">
            <span className="play__cases-block-title">Кейсы</span>
            <button className="play__cases-block-btn" onClick={(e) => { e.stopPropagation(); navigate('/play/cases'); }}>Играть →</button>
          </div>
        </div>

        <div className="play__crash-block" onClick={() => navigate('/play/crash')}>
          <img src="/gifts/svg/rocketbg.svg" alt="Crash" className="play__crash-block-img" />
          <div className="play__cases-block-content">
            <span className="play__cases-block-title">Crash</span>
            <button className="play__cases-block-btn" onClick={(e) => { e.stopPropagation(); navigate('/play/crash'); }}>Играть →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
