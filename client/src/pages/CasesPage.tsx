import { useNavigate } from 'react-router-dom';
import './Play.css';

const cases = [
  { cost: 29, label: 'Basic', bg: '/assets/cmn/basic.png' },
  { cost: 49, label: 'Snake Box', bg: '/assets/cmn/snakebox.png' },
  { cost: 99, label: 'Lol Pop', bg: '/assets/cmn/lolpop.png' },
  { cost: 249, label: 'B-Day Candle', bg: '/assets/cmn/b-daycandle.png' },
  { cost: 349, label: 'Lush Bouquet', bg: '/assets/cmn/lushbouquet.png' },
];

export function CasesPage() {
  const navigate = useNavigate();

  return (
    <div className="play play--select">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>

      <div className="play__cases-grid">
        {cases.map(c => (
          <div
            key={c.cost}
            className="play__case-card"
            style={{ backgroundImage: `url(${c.bg})` }}
            onClick={() => navigate(`/play/${c.cost}`)}
          >
            <span className="play__case-name">{c.label}</span>
            <span className="play__case-cost">{c.cost} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
