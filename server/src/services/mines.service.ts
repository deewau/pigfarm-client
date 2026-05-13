import crypto from 'crypto';
import { WebSocket } from 'ws';
import { gameRepository, userRepository, transactionRepository } from '../db/repository.js';
import { sendBalanceUpdate } from './websocket.js';

const GRID_SIZE = 5;
const TOTAL_CELLS = 25;
const HOUSE_EDGE = 0.03;
const MIN_BET = 1;
const MAX_BET = 10000;

interface MinesGameState {
  gameId: number;
  userId: number;
  minesCount: number;
  betAmount: number;
  cells: boolean[];
  openedCells: Set<number>;
  currentMultiplier: number;
  status: 'active' | 'cashed_out' | 'lost' | 'completed';
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export class MinesGameService {
  private clients = new Map<number, { ws: WebSocket; userId: number; firstName: string }>();
  private wsToUser = new Map<WebSocket, number>();
  private activeGames = new Map<number, MinesGameState>();

  private generateSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  generateMinePositions(serverSeed: string, clientSeed: string, nonce: number, minesCount: number): number[] {
    const positions: number[] = [];
    const available = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}`);
    const hash = hmac.digest('hex');

    for (let i = 0; i < minesCount; i++) {
      const remaining = TOTAL_CELLS - i;
      const idx = parseInt(hash.substring(i * 2, i * 2 + 4), 16) % available.length;
      positions.push(available[idx]);
      available.splice(idx, 1);
    }

    return positions;
  }

  getMultiplierForStep(minesCount: number, openedCount: number): number {
    const remainingCells = TOTAL_CELLS - openedCount;
    const remainingMines = minesCount - openedCount < 0 ? 0 : minesCount;
    const remainingSafe = remainingCells - remainingMines;
    const probability = remainingSafe / remainingCells;
    const fairMultiplier = 1 / probability;
    return fairMultiplier * (1 - HOUSE_EDGE);
  }

  getCumulativeMultiplier(minesCount: number, openedCount: number): number {
    let mult = 1.0;
    for (let i = 0; i < openedCount; i++) {
      mult *= this.getMultiplierForStep(minesCount, i);
    }
    return mult;
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
      case 'ping':
        this.sendTo(ws, { type: 'pong', t: data.t, server_time: Date.now() });
        break;
    }
  }

  private async sendState(userId: number) {
    const client = this.clients.get(userId);
    if (!client) return;
    const user = await userRepository.findById(userId);
    if (!user) return;
    this.sendTo(client.ws, { type: 'state', balance: user.balance });

    const activeGame = this.activeGames.get(userId);
    if (activeGame) {
      this.sendTo(client.ws, {
        type: 'game_state',
        gameId: activeGame.gameId,
        minesCount: activeGame.minesCount,
        betAmount: activeGame.betAmount,
        openedCells: Array.from(activeGame.openedCells),
        currentMultiplier: parseFloat(activeGame.currentMultiplier.toFixed(4)),
        currentWin: Math.floor(activeGame.betAmount * activeGame.currentMultiplier),
        serverSeedHash: activeGame.serverSeedHash,
        status: activeGame.status,
      });
    }
  }

  async startGame(userId: number, betAmount: number, minesCount: number, clientSeed?: string): Promise<any> {
    console.log('[MINES:SERVICE] startGame', { userId, betAmount, minesCount });
    if (betAmount < MIN_BET || betAmount > MAX_BET) {
      console.log('[MINES:SERVICE] INVALID_BET_AMOUNT', { betAmount, MIN_BET, MAX_BET });
      return { success: false, error: 'INVALID_BET_AMOUNT' };
    }
    if (minesCount < 1 || minesCount > 24) {
      console.log('[MINES:SERVICE] INVALID_MINES_COUNT', { minesCount });
      return { success: false, error: 'INVALID_MINES_COUNT' };
    }

    const existing = await gameRepository.findActiveByUserId(userId);
    if (existing) {
      console.log('[MINES:SERVICE] CONCURRENT_GAME_EXISTS', { userId });
      return { success: false, error: 'CONCURRENT_GAME_EXISTS' };
    }

    const user = await userRepository.findById(userId);
    console.log('[MINES:SERVICE] user found', { userId, balance: user?.balance });
    if (!user) return { success: false, error: 'User not found' };
    if (user.balance < betAmount) {
      console.log('[MINES:SERVICE] INSUFFICIENT_BALANCE', { balance: user.balance, betAmount });
      return { success: false, error: 'INSUFFICIENT_BALANCE' };
    }

    const serverSeed = this.generateSeed();
    const serverSeedHash = this.hashSeed(serverSeed);
    const clientSeedFinal = clientSeed || crypto.randomBytes(16).toString('hex');
    const minePositions = this.generateMinePositions(serverSeed, clientSeedFinal, 0, minesCount);

    const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => minePositions.includes(i));

    await userRepository.addBalance(userId, -betAmount);
    await transactionRepository.create({
      user_id: userId,
      amount: betAmount,
      type: 'spend',
      status: 'completed',
      description: `Mines: ставка ${betAmount}⭐ (${minesCount} мин)`,
    });

    const game = await gameRepository.create({
      user_id: userId,
      bet_amount: betAmount,
      mines_count: minesCount,
      cells: JSON.stringify(cells),
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      client_seed: clientSeedFinal,
    });

    sendBalanceUpdate(userId, (await userRepository.findById(userId))!.balance);

    const gameState: MinesGameState = {
      gameId: game.id,
      userId,
      minesCount,
      betAmount,
      cells,
      openedCells: new Set<number>(),
      currentMultiplier: 1.0,
      status: 'active',
      serverSeed,
      serverSeedHash,
      clientSeed: clientSeedFinal,
      nonce: 0,
    };

    this.activeGames.set(userId, gameState);

    const client = this.clients.get(userId);
    if (client) {
      this.sendTo(client.ws, {
        type: 'game_state',
        gameId: game.id,
        minesCount,
        betAmount,
        openedCells: [],
        currentMultiplier: 1.0,
        currentWin: 0,
        nextMultiplier: parseFloat(this.getMultiplierForStep(minesCount, 0).toFixed(4)),
        serverSeedHash,
        status: 'active',
        balance: (await userRepository.findById(userId))!.balance,
      });
    }

    return { success: true, data: { gameId: game.id, serverSeedHash, balance: (await userRepository.findById(userId))!.balance } };
  }

  async revealCell(userId: number, gameId: number, row: number, col: number): Promise<any> {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return { success: false, error: 'INVALID_CELL_COORDS' };
    }

    const gameState = this.activeGames.get(userId);
    if (!gameState || gameState.gameId !== gameId) {
      return { success: false, error: 'GAME_NOT_FOUND' };
    }
    if (gameState.status !== 'active') {
      return { success: false, error: 'GAME_NOT_ACTIVE' };
    }

    const cellIndex = row * GRID_SIZE + col;
    if (gameState.openedCells.has(cellIndex)) {
      return { success: false, error: 'CELL_ALREADY_OPENED' };
    }

    const isMine = gameState.cells[cellIndex];
    gameState.openedCells.add(cellIndex);

    if (isMine) {
      gameState.status = 'lost';
      const now = new Date().toISOString();
      await gameRepository.updateGame(gameId, {
        status: 'lost',
        win_amount: 0,
        opened_cells: JSON.stringify(Array.from(gameState.openedCells)),
        finished_at: now,
      });

      this.activeGames.delete(userId);

      const client = this.clients.get(userId);
      if (client) {
        this.sendTo(client.ws, {
          type: 'cell_revealed',
          cell: { row, col, type: 'mine' },
          game_over: true,
          status: 'lost',
          allMines: gameState.cells.map((isM, i) => isM ? { row: Math.floor(i / GRID_SIZE), col: i % GRID_SIZE } : null).filter(Boolean),
          serverSeed: gameState.serverSeed,
          serverSeedHash: gameState.serverSeedHash,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
          lostAmount: gameState.betAmount,
          balance: (await userRepository.findById(userId))!.balance,
        });
      }

      return {
        success: true,
        data: {
          type: 'mine',
          row, col,
          game_over: true,
          status: 'lost',
          allMines: gameState.cells.map((isM, i) => isM ? { row: Math.floor(i / GRID_SIZE), col: i % GRID_SIZE } : null).filter(Boolean),
          lostAmount: gameState.betAmount,
          serverSeed: gameState.serverSeed,
          serverSeedHash: gameState.serverSeedHash,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
        },
      };
    }

    const openedCount = gameState.openedCells.size;
    const cumulativeMultiplier = this.getCumulativeMultiplier(gameState.minesCount, openedCount);
    gameState.currentMultiplier = cumulativeMultiplier;
    const currentWin = Math.floor(gameState.betAmount * cumulativeMultiplier);

    const safeCellsRemaining = TOTAL_CELLS - gameState.minesCount - openedCount;
    const isComplete = safeCellsRemaining === 0;

    if (isComplete) {
      gameState.status = 'completed';
      const now = new Date().toISOString();
      await userRepository.addBalance(userId, currentWin);
      await gameRepository.updateGame(gameId, {
        status: 'completed',
        win_amount: currentWin,
        opened_cells: JSON.stringify(Array.from(gameState.openedCells)),
        current_multiplier: cumulativeMultiplier,
        finished_at: now,
      });

      sendBalanceUpdate(userId, (await userRepository.findById(userId))!.balance);

      this.activeGames.delete(userId);

      const client = this.clients.get(userId);
      if (client) {
        this.sendTo(client.ws, {
          type: 'cell_revealed',
          cell: { row, col, type: 'diamond' },
          multiplier: parseFloat(cumulativeMultiplier.toFixed(4)),
          winAmount: currentWin,
          openedCount,
          game_over: true,
          status: 'completed',
          serverSeed: gameState.serverSeed,
          serverSeedHash: gameState.serverSeedHash,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
          balance: (await userRepository.findById(userId))!.balance,
        });
      }

      return {
        success: true,
        data: {
          type: 'diamond',
          row, col,
          multiplier: parseFloat(cumulativeMultiplier.toFixed(4)),
          winAmount: currentWin,
          openedCount,
          game_over: true,
          status: 'completed',
          serverSeed: gameState.serverSeed,
          serverSeedHash: gameState.serverSeedHash,
          clientSeed: gameState.clientSeed,
          nonce: gameState.nonce,
        },
      };
    }

    await gameRepository.updateGame(gameId, {
      opened_cells: JSON.stringify(Array.from(gameState.openedCells)),
      current_multiplier: cumulativeMultiplier,
    });

    const nextMultiplier = this.getCumulativeMultiplier(gameState.minesCount, openedCount + 1);

    const client = this.clients.get(userId);
    if (client) {
      this.sendTo(client.ws, {
        type: 'cell_revealed',
        cell: { row, col, type: 'diamond' },
        multiplier: parseFloat(cumulativeMultiplier.toFixed(4)),
        nextMultiplier: parseFloat(nextMultiplier.toFixed(4)),
        winAmount: currentWin,
        openedCount,
        totalCells: TOTAL_CELLS,
        minesCount: gameState.minesCount,
        game_over: false,
      });
    }

    return {
      success: true,
      data: {
        type: 'diamond',
        row, col,
        multiplier: parseFloat(cumulativeMultiplier.toFixed(4)),
        nextMultiplier: parseFloat(nextMultiplier.toFixed(4)),
        winAmount: currentWin,
        openedCount,
        totalCells: TOTAL_CELLS,
        minesCount: gameState.minesCount,
        game_over: false,
      },
    };
  }

  async cashOut(userId: number, gameId: number): Promise<any> {
    const gameState = this.activeGames.get(userId);
    if (!gameState || gameState.gameId !== gameId) {
      return { success: false, error: 'GAME_NOT_FOUND' };
    }
    if (gameState.status !== 'active') {
      return { success: false, error: 'GAME_NOT_ACTIVE' };
    }
    if (gameState.openedCells.size === 0) {
      return { success: false, error: 'No cells opened' };
    }

    const winAmount = Math.floor(gameState.betAmount * gameState.currentMultiplier);
    gameState.status = 'cashed_out';
    const now = new Date().toISOString();

    await userRepository.addBalance(userId, winAmount);
    await gameRepository.updateGame(gameId, {
      status: 'cashed_out',
      win_amount: winAmount,
      opened_cells: JSON.stringify(Array.from(gameState.openedCells)),
      current_multiplier: gameState.currentMultiplier,
      finished_at: now,
    });

    await transactionRepository.create({
      user_id: userId,
      amount: winAmount,
      type: 'deposit',
      status: 'completed',
      description: `Mines: выигрыш ${gameState.betAmount}⭐ x${gameState.currentMultiplier.toFixed(2)} = ${winAmount}⭐`,
    });

    sendBalanceUpdate(userId, (await userRepository.findById(userId))!.balance);
    this.activeGames.delete(userId);

    const client = this.clients.get(userId);
    if (client) {
      this.sendTo(client.ws, {
        type: 'cashed_out',
        winAmount,
        multiplier: parseFloat(gameState.currentMultiplier.toFixed(4)),
        gameId,
        status: 'cashed_out',
        serverSeed: gameState.serverSeed,
        serverSeedHash: gameState.serverSeedHash,
        clientSeed: gameState.clientSeed,
        nonce: gameState.nonce,
        allMines: gameState.cells.map((isM, i) => isM ? { row: Math.floor(i / GRID_SIZE), col: i % GRID_SIZE } : null).filter(Boolean),
        balance: (await userRepository.findById(userId))!.balance,
      });
    }

    return {
      success: true,
      data: {
        winAmount,
        multiplier: parseFloat(gameState.currentMultiplier.toFixed(4)),
        status: 'cashed_out',
        serverSeed: gameState.serverSeed,
        serverSeedHash: gameState.serverSeedHash,
        clientSeed: gameState.clientSeed,
        nonce: gameState.nonce,
      },
    };
  }

  async getHistory(userId: number, limit: number = 20, offset: number = 0): Promise<any> {
    const games = await gameRepository.findHistoryByUserId(userId, limit, offset);
    return { success: true, data: { games } };
  }

  async getActiveGame(userId: number): Promise<any> {
    const game = await gameRepository.findActiveByUserId(userId);
    if (!game) return { success: true, data: null };
    return {
      success: true,
      data: {
        id: game.id,
        minesCount: game.mines_count,
        betAmount: game.bet_amount,
        openedCells: JSON.parse(game.opened_cells),
        currentMultiplier: game.current_multiplier,
        serverSeedHash: game.server_seed_hash,
        status: game.status,
      },
    };
  }

  async verifyGame(gameId: number): Promise<any> {
    const game = await gameRepository.findById(gameId);
    if (!game) return { success: false, error: 'GAME_NOT_FOUND' };

    const cells: boolean[] = JSON.parse(game.cells);
    const minePositions = cells.map((isM, i) => isM ? i : -1).filter(i => i >= 0);

    return {
      success: true,
      data: {
        serverSeed: game.server_seed,
        serverSeedHash: game.server_seed_hash,
        clientSeed: game.client_seed,
        nonce: game.nonce,
        minesCount: game.mines_count,
        minePositions,
        verified: this.hashSeed(game.server_seed) === game.server_seed_hash,
      },
    };
  }

  private sendTo(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }
}

export const minesGameService = new MinesGameService();
