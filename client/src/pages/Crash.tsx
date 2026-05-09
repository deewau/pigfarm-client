import { useNavigate } from 'react-router-dom';
import './Crash.css';

export function Crash() {
  const navigate = useNavigate();

  return (
    <div className="crash">
      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>
      <div className="crash__game-area" />
      <button className="crash__bet-btn">Сделать ставку</button>
    </div>
  );
}
