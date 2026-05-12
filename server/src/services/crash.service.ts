import crypto from 'crypto';
import { WebSocket } from 'ws';
import { userRepository, transactionRepository } from '../db/repository.js';
import { sendBalanceUpdate } from './websocket.js';

const WAITING_DURATION = 8000;
const PAUSE_DURATION = 3000;
const TICK_INTERVAL = 50;
const HOUSE_EDGE = 0.03;

export type CrashGameState = 'waiting' | 'flying' | 'crashed' | 'pause';

interface CrashBet {
  userId: number;
  firstName: string;
  amount: number;
  cashOutAt: number | null;
}

interface CrashRound {
  id: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
  state: CrashGameState;
  bets: Map<number, CrashBet>;
  startTime: number;
}

export class CrashGameService {
  private clients = new Map<number, { ws: WebSocket; userId: number; firstName: string }>();
  private wsToUser = new Map<WebSocket, number>();
  private currentRound: CrashRound | null = null;
  private roundCounter = 0;
  private currentMultiplier = 1.0;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private history: number[] = [];

  constructor() {
    this.startWaiting();
  }

  private generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  private generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hex = hmac.digest('hex');
    const int = parseInt(hex.substring(0, 8), 16);
    const r = int / 0xffffffff;
    return Math.max(1.01, (1 - HOUSE_EDGE) / (1 - r));
  }

  addClient(ws: WebSocket, userId: number, firstName: string) {
    const existing = this.clients.get(userId);
    if (existing) this.wsToUser.delete(existing.ws);
    this.clients.set(userId, { ws, userId, firstName });
    this.wsToUser.set(ws, userId);
    this.sendState(userId);
  }

  removeClient(ws: WebSocket) {
    const userId = this.wsToUser.get(ws);
    if (userId) this.clients.delete(userId);
    this.wsToUser.delete(ws);
  }

  handleMessage(ws: WebSocket, raw: string) {
    const userId = this.wsToUser.get(ws);
    if (!userId) return;
    let data: any;
    try { data = JSON.parse(raw); } catch { return; }
    switch (data.type) {
      case 'bet':
        this.placeBet(userId, data.amount).catch(console.error);
        break;
      case 'cash_out':
        this.cashOut(userId);
        break;
    }
  }

  private async placeBet(userId: number, amount: number) {
    if (!this.currentRound || this.currentRound.state !== 'waiting') return;
    if (this.currentRound.bets.has(userId)) return;
    if (amount < 1 || !Number.isInteger(amount) || amount > 10000) return;

    const client = this.clients.get(userId);
    if (!client) return;

    const user = await userRepository.findById(userId);
    if (!user || user.balance < amount) {
      this.sendTo(client.ws, { type: 'bet_result', accepted: false, error: 'Недостаточно средств' });
      return;
    }

    await userRepository.addBalance(userId, -amount);
    await transactionRepository.create({
      user_id: userId, amount, type: 'spend', status: 'completed',
      description: `Crash: ставка ${amount}⭐`,
    });

    const updated = await userRepository.findById(userId);
    if (updated) sendBalanceUpdate(userId, updated.balance);

    this.currentRound.bets.set(userId, { userId, firstName: client.firstName, amount, cashOutAt: null });

    this.sendTo(client.ws, { type: 'bet_result', accepted: true, amount, balance: updated?.balance ?? 0 });
    this.broadcastBets();
  }

  private cashOut(userId: number) {
    if (!this.currentRound || this.currentRound.state !== 'flying') return;
    const bet = this.currentRound.bets.get(userId);
    if (!bet || bet.cashOutAt !== null) return;

    const multiplier = this.currentMultiplier;
    bet.cashOutAt = multiplier;
    const won = Math.floor(bet.amount * multiplier);

    userRepository.addBalance(userId, won).then(u => {
      transactionRepository.create({
        user_id: userId, amount: won, type: 'deposit', status: 'completed',
        description: `Crash: выигрыш ${bet.amount}⭐ x${multiplier.toFixed(2)} = ${won}⭐`,
      });
      sendBalanceUpdate(userId, u.balance);
    }).catch(console.error);

    const client = this.clients.get(userId);
    if (client) {
      this.sendTo(client.ws, {
        type: 'cash_out_result', round_id: this.currentRound!.id,
        multiplier: parseFloat(multiplier.toFixed(2)), won, amount: bet.amount,
      });
    }
    this.broadcastBets();
  }

  private startWaiting() {
    this.roundCounter++;
    const serverSeed = this.generateSeed();
    const serverSeedHash = this.hashSeed(serverSeed);
    const clientSeed = this.generateSeed();
    const crashPoint = this.generateCrashPoint(serverSeed, clientSeed, 0);

    this.currentRound = {
      id: this.roundCounter, serverSeed, serverSeedHash, clientSeed, nonce: 0,
      crashPoint, state: 'waiting', bets: new Map(), startTime: Date.now(),
    };
    this.currentMultiplier = 1.0;

    this.broadcast({
      type: 'state', state: 'waiting', round_id: this.roundCounter,
      countdown: WAITING_DURATION / 1000, server_seed_hash: serverSeedHash,
    });

    this.stateTimer = setTimeout(() => this.startFlying(), WAITING_DURATION);
  }

  private startFlying() {
    if (!this.currentRound) return;
    this.currentRound.state = 'flying';
    this.currentRound.startTime = Date.now();
    this.currentMultiplier = 1.0;

    this.broadcast({ type: 'state', state: 'flying', round_id: this.currentRound.id });
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL);
  }

  private tick() {
    if (!this.currentRound || this.currentRound.state !== 'flying') return;
    const t = (Date.now() - this.currentRound.startTime) / 1000;
    this.currentMultiplier = Math.pow(1.6, t / 9);

    if (this.currentMultiplier >= this.currentRound.crashPoint) {
      this.crash();
      return;
    }

    this.broadcast({
      type: 'tick', multiplier: parseFloat(this.currentMultiplier.toFixed(2)),
      round_id: this.currentRound.id,
    });
  }

  private crash() {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
    if (!this.currentRound) return;

    this.currentRound.state = 'crashed';
    const cp = this.currentRound.crashPoint;
    this.history = [cp, ...this.history].slice(0, 50);

    const results = Array.from(this.currentRound.bets.values()).map(b => ({
      userId: b.userId, firstName: b.firstName, amount: b.amount,
      cashOutAt: b.cashOutAt ? parseFloat(b.cashOutAt.toFixed(2)) : null,
      won: b.cashOutAt !== null ? Math.floor(b.amount * b.cashOutAt) : 0,
      crashed: b.cashOutAt === null,
    }));

    this.broadcast({
      type: 'state', state: 'crashed', round_id: this.currentRound.id,
      crash_point: parseFloat(cp.toFixed(2)), results,
    });

    this.stateTimer = setTimeout(() => {
      this.currentRound = null;
      this.broadcast({
        type: 'state', state: 'pause', round_id: this.roundCounter,
        countdown: Math.ceil(PAUSE_DURATION / 1000),
      });
      this.stateTimer = setTimeout(() => this.startWaiting(), PAUSE_DURATION);
    }, 1500);
  }

  private broadcast(data: any) {
    const msg = JSON.stringify(data);
    this.clients.forEach(c => { if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg); });
  }

  private sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }

  private sendState(userId: number) {
    const client = this.clients.get(userId);
    if (!client || !this.currentRound) return;

    const r = this.currentRound;
    const msg: any = { type: 'state', state: r.state, round_id: r.id, history: this.history };

    if (r.state === 'waiting') {
      msg.server_seed_hash = r.serverSeedHash;
      msg.countdown = Math.max(0, Math.ceil((WAITING_DURATION - (Date.now() - r.startTime)) / 1000));
    }
    if (r.state === 'flying') msg.multiplier = parseFloat(this.currentMultiplier.toFixed(2));
    if (r.state === 'crashed' || r.state === 'pause') msg.crash_point = parseFloat(r.crashPoint.toFixed(2));

    const userBet = r.bets.get(userId);
    if (userBet) {
      msg.your_bet = userBet.amount;
      msg.your_cash_out = userBet.cashOutAt ? parseFloat(userBet.cashOutAt.toFixed(2)) : null;
    }

    userRepository.findById(userId).then(u => {
      if (u) msg.balance = u.balance;
      this.sendTo(client.ws, msg);
      if (r.bets.size > 0) this.sendBetsTo(client.ws);
    }).catch(() => {
      this.sendTo(client.ws, msg);
      if (r.bets.size > 0) this.sendBetsTo(client.ws);
    });
  }

  private broadcastBets() {
    if (!this.currentRound) return;
    this.broadcast({ type: 'bets', round_id: this.currentRound.id, bets: this.getBetsData() });
  }

  private sendBetsTo(ws: WebSocket) {
    if (!this.currentRound) return;
    this.sendTo(ws, { type: 'bets', round_id: this.currentRound.id, bets: this.getBetsData() });
  }

  private getBetsData() {
    if (!this.currentRound) return [];
    return Array.from(this.currentRound.bets.values()).map(b => ({
      userId: b.userId, firstName: b.firstName, amount: b.amount,
      cashOutAt: b.cashOutAt ? parseFloat(b.cashOutAt.toFixed(2)) : null,
    }));
  }

  getHistory(): number[] {
    return this.history;
  }

  getCurrentRoundInfo() {
    if (!this.currentRound) return null;
    return {
      id: this.currentRound.id,
      state: this.currentRound.state,
      serverSeedHash: this.currentRound.serverSeedHash,
      crashPoint: this.currentRound.state === 'crashed' || this.currentRound.state === 'pause'
        ? parseFloat(this.currentRound.crashPoint.toFixed(2)) : null,
    };
  }
}

export const crashGameService = new CrashGameService();
