import { GiftImage } from './GiftAnimation';
import './LiveFeed.css';

export interface WinItem {
  id: number;
  user_id: number;
  gift_id: string;
  gift_name: string;
  gift_stars: number;
  won_at: string;
  first_name: string;
  username: string | null;
  animationSvg: string | null;
}

interface LiveFeedProps {
  wins: WinItem[];
  sliding: boolean;
}

export function LiveFeed({ wins, sliding }: LiveFeedProps) {
  if (wins.length === 0) {
    return (
      <div className="live-feed">
        <div className="live-feed__label">
          <span className="live-feed__dot" />
          LIVE
        </div>
        <div className="live-feed__empty">Пока никто не выигрывал</div>
      </div>
    );
  }

  return (
    <div className="live-feed">
      <div className="live-feed__label">
        <span className="live-feed__dot" />
        LIVE
      </div>
      <div className={`live-feed__list ${sliding ? 'live-feed__list--sliding' : ''}`}>
        {wins.map((win, index) => (
          <div
            key={win.id}
            className={`live-feed__card ${index === 0 && sliding ? 'live-feed__card--new' : ''}`}
          >
            <div className="live-feed__card-gift">
              {win.animationSvg ? (
                <GiftImage svgContent={win.animationSvg} size={48} uniqueId={`feed-${win.id}`} />
              ) : (
                <GiftImage giftId={win.gift_id} size={48} fallbackEmoji="🎁" />
              )}
            </div>
            <div className="live-feed__card-info">
              <span className="live-feed__card-name">{win.gift_name}</span>
              <span className="live-feed__card-player">{win.first_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
