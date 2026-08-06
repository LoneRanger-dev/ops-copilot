import { env } from '@/config/env';

/**
 * Centralised Redis key builders (MASTER_BUILD_SPEC.md §23.5 backend task 2,
 * §8.6). No inline key strings anywhere else in the codebase — every cache
 * namespace lives here so a collision or a missed prefix is a one-file diff
 * to audit, not a grep across the repo.
 */

function prefixed(suffix: string): string {
  return `${env.REDIS_PREFIX}:${suffix}`;
}

/** Content-addressed, never stale — §12.8. */
export function embeddingCacheKey(contentHash: string): string {
  return prefixed(`emb:v1:${contentHash}`);
}

/**
 * Role is part of the key deliberately — §12.8's security note. Scoped by
 * surface + role only (not per-query): `lib/rag/semantic-cache.ts` stores a
 * small capped list of recent (embedding, answer) entries per scope and
 * does the similarity match in-process, since Redis has no native vector
 * index to key a per-query entry against.
 */
export function semanticCacheKey(surface: string, role: string): string {
  return prefixed(`sem:v1:${surface}:${role}`);
}

export function rateLimitKey(userId: string, routeClass: string): string {
  return prefixed(`rl:${userId}:${routeClass}`);
}
