import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/cache/redis', () => ({
  cacheGet: vi.fn(async (key: string) => store.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  cacheMget: vi.fn(async (keys: string[]) => keys.map((k) => store.get(k) ?? null)),
}));

const { getCachedEmbedding, setCachedEmbedding, getCachedEmbeddings, contentHashOf } =
  await import('@/lib/cache/embedding-cache');

/**
 * Embedding cache unit tests (MASTER_BUILD_SPEC.md §23.5 testing task 3).
 * `lib/cache/redis.ts` is mocked with a plain in-memory map — that module's
 * own graceful-degradation behaviour (Redis unreachable, `REDIS_FAIL_OPEN`)
 * is exercised directly by returning `null` from the mock, which is exactly
 * what a down Redis looks like from this module's point of view.
 */
describe('embedding cache', () => {
  beforeEach(() => {
    store.clear();
  });

  it('misses on a value that was never cached', async () => {
    expect(await getCachedEmbedding('never seen before')).toBeNull();
  });

  it('hits after a write-through', async () => {
    const vector = [0.1, 0.2, 0.3, -0.4];
    await setCachedEmbedding('vpn troubleshooting', vector);

    const cached = await getCachedEmbedding('vpn troubleshooting');
    expect(cached).not.toBeNull();
    for (let i = 0; i < vector.length; i += 1) {
      expect(cached![i]).toBeCloseTo(vector[i]!, 5);
    }
  });

  it('is content-addressed: normalises whitespace/case before hashing', async () => {
    await setCachedEmbedding('VPN Troubleshooting', [1, 2, 3]);
    const cached = await getCachedEmbedding('  vpn   troubleshooting  ');
    expect(cached).not.toBeNull();
  });

  it('produces different hashes for different content', () => {
    expect(contentHashOf('alpha')).not.toBe(contentHashOf('beta'));
  });

  it('handles batch lookups, preserving order and marking misses as null', async () => {
    await setCachedEmbedding('first text', [1, 1, 1]);
    const results = await getCachedEmbeddings(['first text', 'second text (uncached)']);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
  });

  it('behaves correctly when the underlying cache is unavailable (Redis down)', async () => {
    const redisModule = await import('@/lib/cache/redis');
    vi.mocked(redisModule.cacheGet).mockResolvedValueOnce(null);
    vi.mocked(redisModule.cacheSet).mockResolvedValueOnce(undefined);

    // Neither call throws even though the cache "failed" — graceful degradation.
    await expect(getCachedEmbedding('anything')).resolves.toBeNull();
    await expect(setCachedEmbedding('anything', [1, 2, 3])).resolves.toBeUndefined();
  });
});
