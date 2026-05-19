import { useNavigate } from 'react-router-dom';
import './Play.css';

const GAMES = [
  {
    id: 'cases',
    title: 'КЕЙСЫ',
    path: '/play/cases',
    cover: '/assets/cmn/casebg.png',
    layout: 'full' as const,
  },
  {
    id: 'crash',
    title: 'CRASH',
    path: '/play/crash',
    cover: '/assets/cmn/rocketback.png',
    layout: 'half' as const,
  },
  {
    id: 'mines',
    title: 'MINES',
    path: '/play/mines',
    cover: '/assets/cmn/minesbg.png',
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
            className={`play__game-card play__game-card--${game.layout}${'cover' in game ? ` play__game-card--cover play__game-card--${game.id}` : ''}`}
            style={'cover' in game ? undefined : { background: game.gradient }}
            onClick={() => navigate(game.path)}
          >
            {'cover' in game && (
              <img src={game.cover} alt="" className="play__game-card__cover" draggable={false} />
            )}
            {'image' in game && (
              <div className="play__game-card__art">
                <img src={game.image} alt="" className="play__game-card__img" draggable={false} />
              </div>
            )}
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
