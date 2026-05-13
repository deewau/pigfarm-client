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

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

const MAX_WINS = 50;
const QUEUE_DELAY = 400;

interface LiveFeedContextType {
  liveWins: WinItem[];
  connectionState: ConnectionState;
  addOwnWin: (win: WinItem) => void;
}

const LiveFeedContext = createContext<LiveFeedContextType | undefined>(undefined);

export function LiveFeedProvider({ children }: { children: ReactNode }) {
  console.log('📡 LiveFeedProvider: MOUNTED');

  const [liveWins, setLiveWins] = useState<WinItem[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const recentWinIdsRef = useRef(new Set<number>());
  const queueRef = useRef<WinItem[]>([]);
  const isProcessingQueueRef = useRef(false);

  const getWsUrl = () => {
    const isDev = window.location.port === '5173';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isDev ? 'localhost:3000' : window.location.host;
    return `${protocol}//${host}/ws/live`;
  };

  const addWinToState = useCallback((win: WinItem) => {
    if (recentWinIdsRef.current.has(win.id)) {
      return;
    }
    recentWinIdsRef.current.add(win.id);
    if (recentWinIdsRef.current.size > MAX_WINS + 10) {
      const ids = Array.from(recentWinIdsRef.current);
      ids.slice(0, ids.length - MAX_WINS).forEach(id => recentWinIdsRef.current.delete(id));
    }

    setLiveWins(prev => {
      const newWins = [win, ...prev];
      return newWins.slice(0, MAX_WINS);
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    if (queueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;

    while (queueRef.current.length > 0) {
      const win = queueRef.current.shift()!;
      addWinToState(win);
      await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY));
    }

    isProcessingQueueRef.current = false;
  }, [addWinToState]);

  const enqueueWin = useCallback((win: WinItem) => {
    if (recentWinIdsRef.current.has(win.id)) {
      return;
    }
    queueRef.current.push(win);
    processQueue();
  }, [processQueue]);

  useEffect(() => {
    winApi.getRecent(10).then(res => {
      if (res.data?.success && res.data.data?.wins) {
        const initialWins = res.data.data.wins.map((w: any) => ({
          ...w,
          user_id: w.user_id ?? 0,
          gift_id: w.gift_id ?? '',
          gift_name: w.gift_name ?? '',
          gift_stars: w.gift_stars ?? 0,
          won_at: w.won_at ?? '',
          first_name: w.first_name ?? '',
          username: w.username ?? null,
          animationSvg: w.animationSvg ?? null,
        }));
        setLiveWins(initialWins);
        initialWins.forEach((w: WinItem) => recentWinIdsRef.current.add(w.id));
      }
    }).catch(err => console.warn('📡 Failed to load initial wins', err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const wsUrl = getWsUrl();
      console.log('📡 WS: Connecting to', wsUrl);
      setConnectionState('reconnecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 WS: CONNECTED SUCCESSFULLY!');
        setConnectionState('connected');
      };

      ws.onerror = (e) => {
        console.error('📡 WS: ERROR', e);
        setConnectionState('disconnected');
      };

      ws.onclose = (e) => {
        console.log('📡 WS: disconnected', e.code, e.reason);
        wsRef.current = null;
        setConnectionState('disconnected');
        if (!cancelled) {
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        }
      };

      ws.onmessage = (event) => {
        console.log('📡 WS: RAW MESSAGE RECEIVED', event.data);
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'history_init') {
            console.log('📡 WS: History init received', msg.data?.wins?.length);
            if (msg.data?.wins && msg.data.wins.length > 0) {
              const historyWins = msg.data.wins.filter((w: WinItem) => !recentWinIdsRef.current.has(w.id));
              if (historyWins.length > 0) {
                setLiveWins(prev => {
                  const allWins = [...historyWins, ...prev];
                  const uniqueWins = allWins.filter((w, i, arr) => 
                    arr.findIndex(x => x.id === w.id) === i
                  );
                  return uniqueWins.slice(0, MAX_WINS);
                });
                historyWins.forEach((w: WinItem) => recentWinIdsRef.current.add(w.id));
              }
            }
          } else if (msg.type === 'new_win') {
            console.log('📡 WS: New win received!', msg.data);
            enqueueWin(msg.data);
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
  }, [enqueueWin]);

  const addOwnWin = useCallback((win: WinItem) => {
    console.log('📡 Adding own win:', win);
    enqueueWin(win);
  }, [enqueueWin]);

  return (
    <LiveFeedContext.Provider value={{ liveWins, connectionState, addOwnWin }}>
      {children}
    </LiveFeedContext.Provider>
  );
}

export function useLiveFeed() {
  const context = useContext(LiveFeedContext);
  if (!context) throw new Error('useLiveFeed must be used within LiveFeedProvider');
  return context;
}
