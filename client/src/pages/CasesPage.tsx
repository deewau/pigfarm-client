import { useNavigate } from 'react-router-dom';
import './Play.css';

const cases = [
  { cost: 29, label: 'Бронзовый', emoji: '🥉', gradient: 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)' },
  { cost: 49, label: 'Серебряный', emoji: '🥈', gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)' },
  { cost: 99, label: 'Золотой', emoji: '🥇', gradient: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)' },
];

export function CasesPage() {
  const navigate = useNavigate();

  return (
    <div className="play play--select">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>
      
      <h2 className="play__title">Рулетка</h2>
      <p className="play__subtitle">Выберите кейс</p>

      <div className="play__cases-grid">
        {cases.map(c => (
          <div
            key={c.cost}
            className="play__case-card"
            style={{ background: c.gradient }}
            onClick={() => navigate(`/play/${c.cost}`)}
          >
            <span className="play__case-emoji">{c.emoji}</span>
            <span className="play__case-name">{c.label}</span>
            <span className="play__case-cost">{c.cost} ⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
