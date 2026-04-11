import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import './ComingSoon.css';

interface ComingSoonProps {
  title: string;
  subtitle: string;
  icon: string;
}

export const ComingSoon: FC<ComingSoonProps> = ({ subtitle, icon }) => {
  const navigate = useNavigate();

  return (
    <div className="coming-soon">
      <div className="coming-soon__content">
        <div className="coming-soon__icon">{icon}</div>
        <h2 className="coming-soon__title">Coming soon</h2>
        <p className="coming-soon__subtitle">{subtitle}</p>
        <button className="coming-soon__btn" onClick={() => navigate('/')}>
          Return home
        </button>
      </div>
    </div>
  );
};
