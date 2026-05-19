import { GiftImage } from './GiftAnimation';
import { type ConnectionState } from '../contexts/LiveFeedContext';
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
  connectionState: ConnectionState;
}

export function LiveFeed({ wins, connectionState }: LiveFeedProps) {
  const getDotClass = () => {
    switch (connectionState) {
      case 'connected': return 'live-feed__dot--connected';
      case 'reconnecting': return 'live-feed__dot--reconnecting';
      case 'disconnected': return 'live-feed__dot--disconnected';
    }
  };

  return (
    <div className="live-feed">
      <div className="live-feed__live">
        <span className={`live-feed__dot ${getDotClass()}`} />
        <span className="live-feed__label-text">LIVE</span>
      </div>
      {wins.length === 0 ? (
        <div className="live-feed__empty">Пока никто не выигрывал</div>
      ) : (
        <div className="live-feed__scroll-container">
          <div className="live-feed__list">
            {wins.map((win, index) => (
              <div
                key={`${win.id}-${index}`}
                className={`live-feed__card ${index === 0 ? 'live-feed__card--new' : ''}`}
              >
                <div className="live-feed__card-gift">
                  {win.animationSvg ? (
                    <GiftImage svgContent={win.animationSvg} size={30} uniqueId={`feed-${win.id}`} />
                  ) : (
                    <GiftImage giftId={win.gift_id} size={30} fallbackEmoji="🎁" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
