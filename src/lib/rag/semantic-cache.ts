import { cacheGet, cacheSet } from '@/lib/cache/redis';
import { semanticCacheKey } from '@/lib/cache/keys';
import { env } from '@/config/env';
import { embed } from '@/lib/ai/llm/embeddings';
import { incrCounter } from '@/lib/observability/metrics';
import type { UserRole, Surface } from '@/config/constants';

/**
 * Semantic answer cache (MASTER_BUILD_SPEC.md §12.8, §23.6 backend task 6).
 *
 * **The cache key includes surface AND role. This is not optional.** Caching
 * an answer generated for a `support_engineer` (who can see `restricted`
 * chunks) and serving it to an `end_user` would leak restricted content
 * through the cache — §12.8 calls this a security defect, not a performance
 * shortcut, and `semantic-cache.test.ts` asserts it directly.
 *
 * Redis has no native vector index, so this stores a small, capped list of
 * recent (embedding, answer) entries per scope and computes cosine
 * similarity in-process on lookup — reasonable at the entry cap used here
 * (50/scope) and consistent with `lib/cache/redis.ts`'s graceful
 * degradation (a cache miss on a down Redis is indistinguishable from an
 * empty cache to the caller).
 */

const MAX_ENTRIES_PER_SCOPE = 50;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour, §12.8

interface CacheEntry {
  readonly queryHash: string;
  readonly embedding: readonly number[];
  readonly answer: string;
  readonly citations: readonly { readonly documentId: string; readonly title: string }[];
  readonly createdAt: number;
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function readScope(surface: Surface, role: UserRole): Promise<CacheEntry[]> {
  const raw = await cacheGet(semanticCacheKey(surface, role));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CacheEntry[];
  } catch {
    return [];
  }
}

async function writeScope(
  surface: Surface,
  role: UserRole,
  entries: readonly CacheEntry[],
): Promise<void> {
  await cacheSet(
    semanticCacheKey(surface, role),
    JSON.stringify(entries),
    CACHE_TTL_SECONDS,
  );
}

export interface SemanticCacheHit {
  readonly answer: string;
  readonly citations: readonly { readonly documentId: string; readonly title: string }[];
  readonly similarity: number;
}

/** Returns the cached answer if a prior query in this exact scope is a near-duplicate. */
export async function getSemanticCacheHit(
  query: string,
  surface: Surface,
  role: UserRole,
): Promise<SemanticCacheHit | null> {
  const entries = await readScope(surface, role);
  if (entries.length === 0) return null;

  const queryEmbedding = await embed(query);

  let best: { entry: CacheEntry; similarity: number } | null = null;
  for (const entry of entries) {
    const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
    if (!best || similarity > best.similarity) best = { entry, similarity };
  }

  if (!best || best.similarity < env.SEMANTIC_CACHE_THRESHOLD) return null;

  incrCounter('semantic_cache.hit');
  return {
    answer: best.entry.answer,
    citations: best.entry.citations,
    similarity: best.similarity,
  };
}

export async function writeSemanticCache(
  query: string,
  surface: Surface,
  role: UserRole,
  answer: string,
  citations: readonly { readonly documentId: string; readonly title: string }[],
): Promise<void> {
  const queryEmbedding = await embed(query);
  const entries = await readScope(surface, role);

  const next: CacheEntry[] = [
    {
      queryHash: query,
      embedding: queryEmbedding,
      answer,
      citations,
      createdAt: Date.now(),
    },
    ...entries,
  ].slice(0, MAX_ENTRIES_PER_SCOPE);

  await writeScope(surface, role, next);
  incrCounter('semantic_cache.write');
}

/** Flushes every role's cache for a surface — called on any KB document create/update/delete. */
export async function flushSemanticCacheScope(surface: Surface): Promise<void> {
  const roles: readonly UserRole[] = ['end_user', 'support_engineer', 'manager', 'admin'];
  await Promise.all(roles.map((role) => writeScope(surface, role, [])));
}
