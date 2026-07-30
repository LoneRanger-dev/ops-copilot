import { cacheGet, cacheMget, cacheSet } from './redis';
import { embeddingCacheKey } from './keys';
import { sha256 } from '@/lib/utils/hash';

/**
 * Embedding cache (MASTER_BUILD_SPEC.md §12.8, §23.5 backend task 3).
 * Content-addressed by `sha256(normalised_text)`, so it is never stale — a
 * text change means a new key, not an invalidation problem. 30-day TTL.
 */

const EMBEDDING_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

function encodeEmbedding(vector: readonly number[]): string {
  return Buffer.from(new Float32Array(vector).buffer).toString('base64');
}

function decodeEmbedding(base64: string): number[] {
  const buffer = Buffer.from(base64, 'base64');
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  return Array.from(floats);
}

function normaliseForHash(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function contentHashOf(text: string): string {
  return sha256(normaliseForHash(text));
}

export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const raw = await cacheGet(embeddingCacheKey(contentHashOf(text)));
  return raw ? decodeEmbedding(raw) : null;
}

export async function setCachedEmbedding(
  text: string,
  vector: readonly number[],
): Promise<void> {
  await cacheSet(
    embeddingCacheKey(contentHashOf(text)),
    encodeEmbedding(vector),
    EMBEDDING_CACHE_TTL_SECONDS,
  );
}

/** Batch lookup, preserving input order; `null` entries are cache misses. */
export async function getCachedEmbeddings(
  texts: readonly string[],
): Promise<(number[] | null)[]> {
  const keys = texts.map((t) => embeddingCacheKey(contentHashOf(t)));
  const raw = await cacheMget(keys);
  return raw.map((value) => (value ? decodeEmbedding(value) : null));
}
