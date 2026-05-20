export type PlinkoRisk = 'low' | 'medium' | 'high';

export interface PlinkoConfig {
  minRows: number;
  maxRows: number;
  risks: PlinkoRisk[];
  houseEdge: number;
  targetRtp: number;
  tables: Record<PlinkoRisk, Record<number, number[]>>;
}

export function getMultipliers(
  config: PlinkoConfig,
  risk: PlinkoRisk,
  rows: number
): number[] {
  return config.tables[risk]?.[rows] ?? [];
}

export function formatMultiplier(value: number): string {
  if (value >= 100) return `${Math.round(value)}×`;
  if (value >= 10) return `${value.toFixed(1)}×`;
  return `${value.toFixed(2)}×`;
}
