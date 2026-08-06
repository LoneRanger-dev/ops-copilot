import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/cache/redis', () => ({
  cacheGet: vi.fn(async (key: string) => store.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
}));

vi.mock('@/lib/ai/llm/embeddings', () => ({
  embed: vi.fn(async () => {
    return [1, 0, 0];
  }),
}));

const metrics = await import('@/lib/observability/metrics');
const { getSemanticCacheHit, writeSemanticCache } =
  await import('@/lib/rag/semantic-cache');

describe('metrics integration - semantic cache', () => {
  beforeEach(() => {
    store.clear();
    metrics.resetCountersForTests();
  });

  it('increments write and hit counters on cache write and subsequent hit', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
      'Reset it via the self-service portal.',
      [{ documentId: 'doc-1', title: 'VPN Certificate' }],
    );

    const countersAfterWrite = metrics.getCounters();
    expect(countersAfterWrite['semantic_cache.write']).toBe(1);

    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).not.toBeNull();

    const countersAfterHit = metrics.getCounters();
    expect(countersAfterHit['semantic_cache.hit']).toBe(1);
  });
});
