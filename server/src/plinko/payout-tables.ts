import {
  assertRtpWithinTolerance,
  buildRawMultipliers,
  finalizeMultipliers,
} from './math.js';
import {
  PLINKO_HOUSE_EDGE,
  PLINKO_MAX_ROWS,
  PLINKO_MIN_ROWS,
  PLINKO_RISKS,
  type PlinkoRisk,
} from './types.js';

export type PayoutTableMap = Record<PlinkoRisk, Record<number, number[]>>;

function buildAllPayoutTables(): PayoutTableMap {
  const tables = {} as PayoutTableMap;

  for (const risk of PLINKO_RISKS) {
    tables[risk] = {};
    for (let rows = PLINKO_MIN_ROWS; rows <= PLINKO_MAX_ROWS; rows++) {
      const raw = buildRawMultipliers(rows, risk, PLINKO_HOUSE_EDGE);
      const multipliers = finalizeMultipliers(raw);
      assertRtpWithinTolerance(multipliers, rows);
      tables[risk][rows] = multipliers;
    }
  }

  return tables;
}

/** Immutable payout tables — single source of truth for game logic and /config */
export const PAYOUT_TABLES: PayoutTableMap = buildAllPayoutTables();

export function getMultiplier(risk: PlinkoRisk, rows: number, bucket: number): number {
  const table = PAYOUT_TABLES[risk][rows];
  if (!table) {
    throw new Error(`Invalid plinko configuration: risk=${risk} rows=${rows}`);
  }
  if (bucket < 0 || bucket >= table.length) {
    throw new Error(`Invalid bucket index: ${bucket} for rows=${rows}`);
  }
  return table[bucket];
}

export function getPayoutTable(risk: PlinkoRisk, rows: number): readonly number[] {
  return PAYOUT_TABLES[risk][rows];
}

export function exportConfigPayload(): {
  minRows: number;
  maxRows: number;
  risks: PlinkoRisk[];
  houseEdge: number;
  targetRtp: number;
  tables: PayoutTableMap;
} {
  return {
    minRows: PLINKO_MIN_ROWS,
    maxRows: PLINKO_MAX_ROWS,
    risks: [...PLINKO_RISKS],
    houseEdge: PLINKO_HOUSE_EDGE,
    targetRtp: 1 - PLINKO_HOUSE_EDGE,
    tables: PAYOUT_TABLES,
  };
}
