import crypto from 'crypto';

const PATH_CHUNK_HEX_CHARS = 8;

/**
 * Deterministic path from provably-fair HMAC chain.
 * Each row: 0 = left, 1 = right. Bucket = sum(path).
 */
export function generatePlinkoPath(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number
): number[] {
  if (rows < 1) {
    throw new Error('rows must be >= 1');
  }

  const path: number[] = [];
  let round = 0;
  let cursor = 0;
  let hash = hmacHex(serverSeed, `${clientSeed}:${nonce}`);

  for (let row = 0; row < rows; row++) {
    if (cursor > hash.length - PATH_CHUNK_HEX_CHARS) {
      round += 1;
      hash = hmacHex(serverSeed, `${clientSeed}:${nonce}:${round}`);
      cursor = 0;
    }

    const chunk = hash.substring(cursor, cursor + PATH_CHUNK_HEX_CHARS);
    const value = parseInt(chunk, 16);
    path.push(value % 2);
    cursor += PATH_CHUNK_HEX_CHARS;
  }

  return path;
}

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function sanitizeClientSeed(input: unknown): string | null {
  if (input === undefined || input === null || input === '') {
    return null;
  }
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length < 1 || trimmed.length > 64) {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function hmacHex(serverSeed: string, message: string): string {
  return crypto.createHmac('sha256', serverSeed).update(message).digest('hex');
}
