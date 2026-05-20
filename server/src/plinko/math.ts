import type { PlinkoRisk } from './types.js';
import { PLINKO_TARGET_RTP } from './types.js';

/** C(n, k) */
export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** P(X = k) for k rights in n rows */
export function binomialProbability(n: number, k: number): number {
  return binomialCoefficient(n, k) / 2 ** n;
}

export function bucketFromPath(path: readonly number[]): number {
  return path.reduce((sum, bit) => sum + bit, 0);
}

export function calculateExpectedValue(multipliers: readonly number[], rows: number): number {
  let ev = 0;
  for (let k = 0; k <= rows; k++) {
    ev += binomialProbability(rows, k) * multipliers[k];
  }
  return ev;
}

/**
 * Risk shapes variance: low = safer centre, high = volatile edges.
 * Factors are applied before RTP normalization.
 */
function riskShapeFactor(risk: PlinkoRisk, bucket: number, rows: number): number {
  const center = rows / 2;
  const dist = Math.abs(bucket - center) / Math.max(center, 1);

  switch (risk) {
    case 'low':
      return 1.55 - 0.85 * dist;
    case 'high':
      return 0.5 + 1.15 * dist;
    case 'medium':
    default:
      return 1.0 + 0.2 * (dist - 0.35);
  }
}

export function buildRawMultipliers(rows: number, risk: PlinkoRisk, houseEdge: number): number[] {
  const targetRtp = 1 - houseEdge;
  const shaped: number[] = [];

  for (let k = 0; k <= rows; k++) {
    const p = binomialProbability(rows, k);
    const fair = targetRtp / p;
    shaped.push(fair * riskShapeFactor(risk, k, rows));
  }

  const ev = calculateExpectedValue(shaped, rows);
  const scale = targetRtp / ev;
  return shaped.map((m) => m * scale);
}

export function finalizeMultipliers(raw: number[]): number[] {
  return raw.map((m) => {
    const rounded = Math.round(m * 100) / 100;
    return Math.max(0.1, rounded);
  });
}

export function assertRtpWithinTolerance(
  multipliers: readonly number[],
  rows: number,
  tolerance = 0.008
): void {
  const ev = calculateExpectedValue(multipliers, rows);
  if (Math.abs(ev - PLINKO_TARGET_RTP) > tolerance) {
    throw new Error(
      `Plinko payout table RTP out of range: rows=${rows} ev=${ev.toFixed(4)} target=${PLINKO_TARGET_RTP}`
    );
  }
}
