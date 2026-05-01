import { GiftImage } from './GiftAnimation';

interface WinItem {
  id: number;
  gift_id: string;
  gift_name: string;
  gift_stars: number;
  won_at: string;
  first_name: string;
  username: string | null;
  animationSvg: string | null;
}

interface LiveFeedCardProps {
  win: WinItem;
  isNew?: boolean; // Для анимации появления
}

export function LiveFeedCard({ win, isNew }: LiveFeedCardProps) {
  return (
    <div className={`live-feed__card ${isNew ? 'live-feed__card--new' : ''}`}>
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
  );
}
