import { useNavigate } from 'react-router-dom';
import './Play.css';

const cases = [
  { cost: 29, label: 'Basic', img: '/gifts/svg/5170521118301225164.svg', gradient: 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)' },
  { cost: 49, label: 'Snake Box', img: '/gifts/svg/snakebox.svg', gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)' },
  { cost: 99, label: 'Lol Pop', img: '/gifts/svg/lolpop.svg', gradient: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)' },
  { cost: 249, label: 'B-Day Candle', img: '/gifts/svg/b-daycandle.svg', gradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
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
            style={{ background: c.gradient }}
            onClick={() => navigate(`/play/${c.cost}`)}
          >
            <img src={c.img} alt={c.label} className="play__case-img" />
            <span className="play__case-name">{c.label}</span>
            <span className="play__case-cost">{c.cost} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
