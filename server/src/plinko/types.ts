export const PLINKO_MIN_ROWS = 8;
export const PLINKO_MAX_ROWS = 16;
export const PLINKO_MIN_BET = 1;
export const PLINKO_MAX_BET = 10000;
export const PLINKO_HOUSE_EDGE = 0.03;
export const PLINKO_TARGET_RTP = 1 - PLINKO_HOUSE_EDGE;

export const PLINKO_RISKS = ['low', 'medium', 'high'] as const;
export type PlinkoRisk = (typeof PLINKO_RISKS)[number];

export const PLINKO_ROW_OPTIONS = Array.from(
  { length: PLINKO_MAX_ROWS - PLINKO_MIN_ROWS + 1 },
  (_, i) => PLINKO_MIN_ROWS + i
);

export interface PlinkoGameRecord {
  id: number;
  user_id: number;
  bet_amount: number;
  rows: number;
  risk: PlinkoRisk;
  path: number[];
  bucket: number;
  multiplier: number;
  win_amount: number;
  profit: number;
  server_seed: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  created_at: string;
}

export interface PlinkoDropResult {
  gameId: number;
  path: number[];
  bucket: number;
  rows: number;
  risk: PlinkoRisk;
  betAmount: number;
  multiplier: number;
  winAmount: number;
  profit: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  balance: number;
}
