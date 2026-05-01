import { useState, useEffect, useRef } from 'react';
import { winApi } from '../services/api';
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

export function LiveFeed() {
  const [wins, setWins] = useState<WinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    const fetchWins = async () => {
      try {
        const response = await winApi.getRecent(15);
        if (response.success && response.data) {
          setWins(response.data.wins || []);
        }
      } catch (err) {
        console.warn('Failed to load recent wins:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWins();
    const interval = setInterval(fetchWins, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wins.length === 0) return;
    const container = scrollRef.current;
    if (!container) return;

    let animId: number;
    const speed = 0.5;

    const animate = () => {
      scrollPosRef.current += speed;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (scrollPosRef.current >= maxScroll && maxScroll > 0) {
        scrollPosRef.current = 0;
      }
      container.scrollLeft = scrollPosRef.current;
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [wins]);

  if (loading || wins.length === 0) return null;

  const displayWins = [...wins, ...wins];

  return (
    <div className="live-feed">
      <div className="live-feed__label">
        <span className="live-feed__dot" />
        LIVE
      </div>
      <div className="live-feed__track" ref={scrollRef}>
        {displayWins.map((win, i) => (
          <div key={`${win.id}-${i}`} className="live-feed__item">
            <div className="live-feed__gift">
              {win.animationSvg ? (
                <GiftImage svgContent={win.animationSvg} size={28} uniqueId={`feed-${win.id}-${i}`} />
              ) : (
                <GiftImage giftId={win.gift_id} size={28} fallbackEmoji="🎁" />
              )}
            </div>
            <span className="live-feed__name">{win.first_name}</span>
            <span className="live-feed__stars">{win.gift_stars}⭐</span>
          </div>
        ))}
      </div>
    </div>
  );
}
