import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import { crashGameService } from './crash.service.js';
import { validateTelegramInitData } from '../utils/telegram.js';
import { userRepository } from '../db/repository.js';

export interface LiveWin {
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

const MAX_HISTORY_SIZE = 50;
const clients = new Set<WebSocket>();
let winHistory: LiveWin[] = [];

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HTTPServer) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);

    if (url.pathname === '/ws/live') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else if (url.pathname === '/ws/crash') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) { socket.destroy(); return; }

      const initData = url.searchParams.get('initData');
      if (!initData) { socket.destroy(); return; }

      const validated = validateTelegramInitData(decodeURIComponent(initData), botToken);
      if (!validated) { socket.destroy(); return; }

      wss!.handleUpgrade(request, socket, head, (ws) => {
        (ws as any).__crashUser = validated.user;
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (url.pathname === '/ws/live') {
      clients.add(ws);
      console.log(`📡 WebSocket connected. Total clients: ${clients.size}`);

      if (winHistory.length > 0) {
        const historyMsg = JSON.stringify({
          type: 'history_init',
          data: { wins: winHistory },
        });
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(historyMsg);
        }
      }

      ws.on('close', () => {
        clients.delete(ws);
        console.log(`📡 WebSocket disconnected. Total clients: ${clients.size}`);
      });

      ws.on('error', () => {});
    } else if (url.pathname === '/ws/crash') {
      const telegramUser = (ws as any).__crashUser;
      if (!telegramUser) { ws.close(); return; }

      userRepository.findByTelegramId(telegramUser.id).then(user => {
        if (!user) { ws.close(4001, 'User not found'); return; }
        crashGameService.addClient(ws, user.id, user.first_name, user.balance, telegramUser.photo_url);
        ws.on('message', (data) => crashGameService.handleMessage(ws, data.toString()));
        ws.on('close', () => crashGameService.removeClient(ws));
        ws.on('error', () => crashGameService.removeClient(ws));
      }).catch(() => ws.close());
    }
  });

  console.log('📡 WebSocket server initialized on /ws/live and /ws/crash');
}

export function broadcastNewWin(win: LiveWin) {
  winHistory = [win, ...winHistory].slice(0, MAX_HISTORY_SIZE);

  if (clients.size === 0) {
    console.log(`📡 No clients connected, skipping broadcast`);
    return;
  }

  const message = JSON.stringify({
    type: 'new_win',
    data: win,
  });

  let sent = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });

  console.log(`📡 Broadcasted new win: ${win.gift_name} for ${win.first_name} to ${sent}/${clients.size} clients`);
}

export function sendBalanceUpdate(userId: number, newBalance: number) {
  if (clients.size === 0) {
    return;
  }

  const message = JSON.stringify({
    type: 'balance_update',
    data: { user_id: userId, balance: newBalance },
  });

  let sent = 0;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // In a real app you'd want to track which WS belongs to which user
      // For now, broadcast to all (client will filter by user_id)
      client.send(message);
      sent++;
    }
  });

  console.log(`📡 Sent balance update: ${newBalance} for user ${userId} to ${sent} clients`);
}
