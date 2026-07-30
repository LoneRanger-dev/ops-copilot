import { createHash } from 'node:crypto';

/** SHA-256 hex digest — used to content-address embedding cache keys (§12.8). */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
