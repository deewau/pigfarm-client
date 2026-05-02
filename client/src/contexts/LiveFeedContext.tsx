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
  console.log('📡 LiveFeedProvider: MOUNTED');
  
  const [liveWins, setLiveWins] = useState<WinItem[]>([]);
  const [sliding, setSliding] = useState(false);
  const slidingTimeoutRef = useRef<number | null>(null);

  // Global WebSocket
  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3000/ws/live`;
    console.log('📡 WS: Connecting to', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('📡 WS: CONNECTED SUCCESSFULLY!');
    ws.onerror = (e) => console.error('📡 WS: ERROR', e);
    ws.onclose = () => console.log('📡 WS: disconnected');
    
    ws.onmessage = (event) => {
      console.log('📡 WS: RAW MESSAGE RECEIVED', event.data);
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_win') {
          console.log('📡 WS: New win received!', msg.data);
          setSliding(true);
          if (slidingTimeoutRef.current) clearTimeout(slidingTimeoutRef.current);
          slidingTimeoutRef.current = window.setTimeout(() => setSliding(false), 500);
          setLiveWins(prev => [msg.data].concat(prev).slice(0, 5));
        }
      } catch (e) {
        console.warn('📡 WS: Parse error', e);
      }
    };
    
    return () => {
      console.log('📡 WS: Closing');
      ws.close();
    };
  }, []);

  const addOwnWin = useCallback((win: WinItem) => {
    console.log('📡 Adding own win:', win);
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
