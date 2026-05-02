import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

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

interface LiveFeedContextType {
  liveWins: WinItem[];
  sliding: boolean;
  addOwnWin: (win: WinItem) => void;
}

const LiveFeedContext = createContext<LiveFeedContextType | undefined>(undefined);

export function LiveFeedProvider({ children }: { children: ReactNode }) {
  const [liveWins, setLiveWins] = useState<WinItem[]>(() => {
    try {
      const cached = localStorage.getItem('pigfarm_live_wins');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [sliding, setSliding] = useState(false);
  const slidingTimeoutRef = useRef<number | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pigfarm_live_wins', JSON.stringify(liveWins));
    } catch (e) {
      console.warn('Failed to save live wins:', e);
    }
  }, [liveWins]);

  // Global WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.port === '5173';
    const host = isDev ? 'localhost:3000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;
    console.log(`📡 Global WS connecting: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('📡 Global WS connected');
    ws.onerror = (e) => console.error('📡 Global WS error:', e);
    ws.onclose = () => console.log('📡 Global WS disconnected');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_win') {
          const newWin = msg.data as WinItem;
          console.log('📡 Global WS received:', newWin);
          setSliding(true);
          if (slidingTimeoutRef.current) clearTimeout(slidingTimeoutRef.current);
          slidingTimeoutRef.current = window.setTimeout(() => setSliding(false), 500);
          setLiveWins(prev => [newWin].concat(prev).slice(0, 5));
        }
      } catch (e) {
        console.warn('WS parse error:', e);
      }
    };

    return () => ws.close();
  }, []);

  const addOwnWin = useCallback((win: WinItem) => {
    setSliding(true);
    if (slidingTimeoutRef.current) clearTimeout(slidingTimeoutRef.current);
    slidingTimeoutRef.current = window.setTimeout(() => setSliding(false), 500);
    setLiveWins(prev => [win].concat(prev).slice(0, 5));
  }, []);

  return (
    <LiveFeedContext.Provider value={{ liveWins, sliding, addOwnWin }}>
      {children}
    </LiveFeedContext.Provider>
  );
}

export function useLiveFeed() {
  const context = useContext(LiveFeedContext);
  if (!context) throw new Error('useLiveFeed must be used within LiveFeedProvider');
  return context;
}
