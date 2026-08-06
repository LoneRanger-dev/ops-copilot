import Redis from 'ioredis';
import { env, isConfigured } from '@/config/env';
import { logger } from '@/lib/observability/logger';

/**
 * Redis client with graceful degradation (MASTER_BUILD_SPEC.md §23.5 backend
 * task 1). Every operation here returns `null`/`false` rather than throwing
 * when Redis is unreachable or unconfigured and `REDIS_FAIL_OPEN` is true —
 * caching is a performance optimisation, never a correctness dependency.
 * `REDIS_FAIL_OPEN=false` is the one case that re-throws, for operators who
 * want caching failures to be loud.
 */

let client: Redis | undefined;
let connectionFailed = false;

function getClient(): Redis | null {
  if (!isConfigured.redis || !env.REDIS_URL) return null;
  if (connectionFailed) return null;

  client ??= new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  return client;
}

async function withFailOpen<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  const redis = getClient();
  if (!redis) return fallback;

  try {
    if (redis.status === 'wait' || redis.status === 'end') {
      await redis.connect();
    }
    return await operation.call(null);
  } catch (error) {
    connectionFailed = true;
    if (!env.REDIS_FAIL_OPEN) throw error;
    logger.warn(
      { err: error instanceof Error ? error.message : error },
      'Redis operation failed; continuing without cache (REDIS_FAIL_OPEN)',
    );
    return fallback;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  return withFailOpen(() => getClient()!.get(key), null);
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await withFailOpen(async () => {
    await getClient()!.set(key, value, 'EX', ttlSeconds);
    return undefined;
  }, undefined);
}

export async function cacheMget(keys: readonly string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  return withFailOpen(
    () => getClient()!.mget(...keys),
    keys.map(() => null),
  );
}

export async function cacheScan(pattern: string): Promise<string[]> {
  return withFailOpen(async () => {
    const client = getClient()!;
    const stream = client.scanStream({ match: pattern, count: 100 });
    const results: string[] = [];
    for await (const keys of stream) {
      for (const k of keys as string[]) results.push(k);
    }
    return results;
  }, []);
}

/**
 * Atomic increment-with-expiry for fixed-window rate limiting
 * (`lib/cache/rate-limit.ts`). `PEXPIRE ... NX` only sets a TTL the first
 * time a window's key is created — later increments in the same window
 * leave the original expiry untouched, which is what makes it a fixed
 * window rather than a sliding one that never fully resets.
 */
export async function cacheIncrWithWindow(
  key: string,
  windowSeconds: number,
): Promise<number | null> {
  return withFailOpen(async () => {
    const client = getClient()!;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count;
  }, null);
}

export async function cacheSAdd(key: string, member: string): Promise<number | null> {
  return withFailOpen(async () => {
    const client = getClient()!;
    return client.sadd(key, member);
  }, null);
}

export async function cacheSMembers(key: string): Promise<string[]> {
  return withFailOpen(async () => {
    const client = getClient()!;
    return client.smembers(key);
  }, []);
}

/** Test-only: forces the next call to re-attempt a connection. */
export function _resetForTests(): void {
  connectionFailed = false;
  client?.disconnect();
  client = undefined;
}
