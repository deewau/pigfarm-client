import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Crash.css';

function generateStars(count: number, big: boolean): { left: string; top: string; delay: string; duration: string; minOp: string; maxOp: string; size: string }[] {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 4}s`,
      minOp: `${0.2 + Math.random() * 0.3}`,
      maxOp: `${0.6 + Math.random() * 0.4}`,
      size: big ? `${1.5 + Math.random() * 1.5}px` : `${0.5 + Math.random() * 1}px`,
    });
  }
  return stars;
}

const smallStars = generateStars(120, false);
const bigStars = generateStars(40, true);

export function Crash() {
  const navigate = useNavigate();

  return (
    <div className="crash">
      <div className="crash__nebula crash__nebula--purple" />
      <div className="crash__nebula crash__nebula--blue" />
      <div className="crash__nebula crash__nebula--pink" />

      <div className="crash__stars-layer">
        {smallStars.map((s, i) => (
          <div
            key={`s-${i}`}
            className="crash__star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              '--min-opacity': s.minOp,
              '--max-opacity': s.maxOp,
            } as React.CSSProperties}
          />
        ))}
        {bigStars.map((s, i) => (
          <div
            key={`b-${i}`}
            className="crash__star crash__star--big"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              '--min-opacity': s.minOp,
              '--max-opacity': s.maxOp,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="crash__shooting-star" />
      <div className="crash__shooting-star" />
      <div className="crash__shooting-star" />

      <button className="back-btn" onClick={() => navigate('/play')}>← Назад</button>
      <div className="crash__body" />
      <button className="crash__bet-btn">Сделать ставку</button>
    </div>
  );
}
