import { useNavigate } from 'react-router-dom';
import './Play.css';

export function Play() {
  const navigate = useNavigate();

  return (
    <div className="play play--lobby">
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

        <div className="play__mines-block" onClick={() => navigate('/play/mines')}>
          <div className="play__cases-block-content">
            <span className="play__cases-block-title">Mines</span>
            <button className="play__cases-block-btn" onClick={(e) => { e.stopPropagation(); navigate('/play/mines'); }}>Играть →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
