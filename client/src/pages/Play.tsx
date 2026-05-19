import { useNavigate } from 'react-router-dom';
import './Play.css';

const GAMES = [
  {
    id: 'cases',
    title: 'КЕЙСЫ',
    path: '/play/cases',
    image: '/gifts/svg/pepecase.svg',
    gradient: 'linear-gradient(160deg, #1e6b45 0%, #0f3d28 55%, #0a2a1c 100%)',
    layout: 'full' as const,
  },
  {
    id: 'crash',
    title: 'CRASH',
    path: '/play/crash',
    image: '/gifts/svg/rocketbg.svg',
    gradient: 'linear-gradient(160deg, #2a3f8f 0%, #1a2555 50%, #121a3a 100%)',
    layout: 'half' as const,
  },
  {
    id: 'mines',
    title: 'MINES',
    path: '/play/mines',
    image: '/gifts/svg/minesbg.svg',
    gradient: 'linear-gradient(160deg, #1e5a9e 0%, #154878 50%, #0f3258 100%)',
    layout: 'half' as const,
  },
];

export function Play() {
  const navigate = useNavigate();

  return (
    <div className="play play--lobby">
      <div className="play__games-grid">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className={`play__game-card play__game-card--${game.layout}`}
            style={{ background: game.gradient }}
            onClick={() => navigate(game.path)}
          >
            <div className="play__game-card__art">
              <img src={game.image} alt="" className="play__game-card__img" draggable={false} />
            </div>
            <div className="play__game-card__footer">
              <span className="play__game-card__title">{game.title}</span>
              <span className="play__game-card__brand">PIGGIEGIFT</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
