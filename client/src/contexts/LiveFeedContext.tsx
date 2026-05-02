import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

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
  const { user } = useAuth();
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
  const userRef = useRef(user);
  
  // Update user ref when user changes
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    // Always connect to the same hostname as the client, but port 3000 (server)
    const wsHost = `${window.location.hostname}:3000`;
    const wsUrl = `${protocol}//${wsHost}/ws/live`;
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
          const currentUser = userRef.current;
          
          // Ignore own wins (they will be added via addOwnWin when modal opens)
          if (currentUser && newWin.user_id === currentUser.id) {
            console.log('📡 Global WS: ignoring own win');
            return;
          }

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
