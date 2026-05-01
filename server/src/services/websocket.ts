import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';

interface LiveWin {
  id: number;
  user_id: number; // ID пользователя, который выиграл
  gift_id: string;
  gift_name: string;
  gift_stars: number;
  won_at: string;
  first_name: string;
  username: string | null;
  animationSvg: string | null;
}

const clients = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HTTPServer) {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/live') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`📡 WebSocket connected. Total clients: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`📡 WebSocket disconnected. Total clients: ${clients.size}`);
    });
  });

  console.log('📡 WebSocket server initialized on /ws/live');
}

export function broadcastNewWin(win: LiveWin) {
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
