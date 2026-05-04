import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { winApi } from '../services/api';

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
  console.log('📡 LiveFeedProvider: MOUNTED');

  const [liveWins, setLiveWins] = useState<WinItem[]>([]);
  const [sliding, setSliding] = useState(false);
  const slidingTimeoutRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  // Dedup: track recent win IDs (from DB) to prevent duplicates from WS + optimistic update
  const recentWinIdsRef = useRef(new Set<number>());

  // Build WebSocket URL based on environment
  const getWsUrl = () => {
    const isDev = window.location.port === '5173';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isDev ? 'localhost:3000' : window.location.host;
    return `${protocol}//${host}/ws/live`;
  };

  // Fetch initial recent wins from API
  useEffect(() => {
    winApi.getRecent(5).then(res => {
      if (res.data?.success && res.data.data?.wins) {
        setLiveWins(res.data.data.wins.map((w: any) => ({
          ...w,
          user_id: w.user_id ?? 0,
          gift_id: w.gift_id ?? '',
          gift_name: w.gift_name ?? '',
          gift_stars: w.gift_stars ?? 0,
          won_at: w.won_at ?? '',
          first_name: w.first_name ?? '',
          username: w.username ?? null,
          animationSvg: w.animationSvg ?? null,
        })));
      }
    }).catch(err => console.warn('📡 Failed to load initial wins', err));
  }, []);

  // Global WebSocket with auto-reconnect
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const wsUrl = getWsUrl();
      console.log('📡 WS: Connecting to', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => console.log('📡 WS: CONNECTED SUCCESSFULLY!');

      ws.onerror = (e) => console.error('📡 WS: ERROR', e);

      ws.onclose = (e) => {
        console.log('📡 WS: disconnected', e.code, e.reason);
        wsRef.current = null;
        // Auto-reconnect after 3 seconds
        if (!cancelled) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        }
      };

      ws.onmessage = (event) => {
        console.log('📡 WS: RAW MESSAGE RECEIVED', event.data);
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'new_win') {
            console.log('📡 WS: New win received!', msg.data);
            // Dedup by win ID (from DB)
            if (recentWinIdsRef.current.has(msg.data.id)) {
              console.log('📡 WS: Duplicate win, skipping', msg.data.id);
              return;
            }
            recentWinIdsRef.current.add(msg.data.id);
            // Keep only last 20 IDs to avoid memory leak
            if (recentWinIdsRef.current.size > 20) {
              const ids = Array.from(recentWinIdsRef.current);
              ids.slice(0, ids.length - 20).forEach(id => recentWinIdsRef.current.delete(id));
            }

            setSliding(true);
            if (slidingTimeoutRef.current) clearTimeout(slidingTimeoutRef.current);
            slidingTimeoutRef.current = window.setTimeout(() => setSliding(false), 500);
            setLiveWins(prev => [msg.data].concat(prev).slice(0, 5));
          }
        } catch (e) {
          console.warn('📡 WS: Parse error', e);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        console.log('📡 WS: Closing');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const addOwnWin = useCallback((win: WinItem) => {
    console.log('📡 Adding own win:', win);
    // Dedup: track by win ID (from DB) to sync with WS handler
    if (recentWinIdsRef.current.has(win.id)) {
      console.log('📡 addOwnWin: Duplicate, skipping', win.id);
      return;
    }
    recentWinIdsRef.current.add(win.id);

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
