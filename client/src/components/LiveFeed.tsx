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

const MAX_VISIBLE = 5;

export function LiveFeed() {
  const [wins, setWins] = useState<WinItem[]>([]);
  const [newWinId, setNewWinId] = useState<number | null>(null);
  const prevWinsRef = useRef<WinItem[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchWins = async () => {
      try {
        const response = await winApi.getRecent(MAX_VISIBLE + 5);
        if (response.success && response.data?.wins) {
          const newWins = response.data.wins.slice(0, MAX_VISIBLE);

          if (!isInitialMount.current) {
            const prevFirstId = prevWinsRef.current.length > 0 ? prevWinsRef.current[0]?.id : null;
            if (prevFirstId && newWins.length > 0 && newWins[0].id !== prevFirstId) {
              setNewWinId(newWins[0].id);
              setTimeout(() => setNewWinId(null), 500);
            }
          }

          prevWinsRef.current = newWins;
          setWins(newWins);
          isInitialMount.current = false;
        }
      } catch (err) {
        console.warn('Failed to load recent wins:', err);
      }
    };

    fetchWins();
    const interval = setInterval(fetchWins, 5000);
    return () => clearInterval(interval);
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="live-feed">
      <div className="live-feed__label">
        <span className="live-feed__dot" />
        LIVE
      </div>
      <div className="live-feed__list">
        {wins.map((win, i) => (
          <div
            key={win.id}
            className={`live-feed__card ${win.id === newWinId ? 'live-feed__card--enter' : ''}`}
          >
            <div className="live-feed__card-gift">
              {win.animationSvg ? (
                <GiftImage svgContent={win.animationSvg} size={48} uniqueId={`feed-${win.id}`} />
              ) : (
                <GiftImage giftId={win.gift_id} size={48} fallbackEmoji="🎁" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
          <div key={`${win.id}-${i}`} className="live-feed__card">
            <div className="live-feed__card-gift">
              {win.animationSvg ? (
                <GiftImage svgContent={win.animationSvg} size={40} uniqueId={`feed-${win.id}-${i}`} />
              ) : (
                <GiftImage giftId={win.gift_id} size={40} fallbackEmoji="🎁" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
