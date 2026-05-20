/**
 * Dev utility: run with `npx tsx src/plinko/verify-tables.ts`
 * Validates RTP for all payout tables at startup expectations.
 */
import { calculateExpectedValue } from './math.js';
import { PAYOUT_TABLES } from './payout-tables.js';
import { PLINKO_MAX_ROWS, PLINKO_MIN_ROWS, PLINKO_RISKS, PLINKO_TARGET_RTP } from './types.js';

let ok = true;

for (const risk of PLINKO_RISKS) {
  for (let rows = PLINKO_MIN_ROWS; rows <= PLINKO_MAX_ROWS; rows++) {
    const table = PAYOUT_TABLES[risk][rows];
    const ev = calculateExpectedValue(table, rows);
    const drift = Math.abs(ev - PLINKO_TARGET_RTP);
    if (drift > 0.008) {
      console.error(`FAIL risk=${risk} rows=${rows} ev=${ev.toFixed(4)} drift=${drift.toFixed(4)}`);
      ok = false;
    } else {
      console.log(`OK   risk=${risk} rows=${rows} ev=${ev.toFixed(4)} edge=${(1 - ev).toFixed(4)}`);
    }
  }
}

if (!ok) process.exit(1);
console.log('All plinko payout tables within RTP tolerance.');
