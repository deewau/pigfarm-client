import { useState, useEffect, useRef } from 'react';
import { GiftImage } from './GiftAnimation';
import './LiveFeed.css';

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

const MAX_VISIBLE = 5;

export function LiveFeed() {
  const [wins, setWins] = useState<WinItem[]>([]);
  const [sliding, setSliding] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live`);
    wsRef.current = ws;

    ws.onopen = () => console.log('📡 WS connected');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_win') {
          const newWin = msg.data as WinItem;

          // Start sliding animation
          setSliding(true);

          // Update list: prepend new win, keep only last MAX_VISIBLE
          setWins(prev => {
            const updated = [newWin, ...prev].slice(0, MAX_VISIBLE);
            return updated;
          });

          // Remove sliding class after animation
          setTimeout(() => setSliding(false), 500);
        }
      } catch (e) {
        console.warn('WS message parse error:', e);
      }
    };
    ws.onclose = () => console.log('📡 WS disconnected');

    return () => ws.close();
  }, []);

  if (wins.length === 0) return null;

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
