import { describe, expect, it, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/cache/redis', () => ({
  cacheGet: vi.fn(async (key: string) => store.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
}));

// Deterministic fake embeddings: same text -> same vector, so similarity is
// exactly 1.0 for identical queries and controllable for paraphrase tests.
vi.mock('@/lib/ai/llm/embeddings', () => ({
  embed: vi.fn(async (text: string) => {
    if (text.includes('vpn certificate')) return [1, 0, 0];
    if (text.includes('vpn cert renewal')) return [0.99, 0.14, 0]; // near-duplicate, cos ~0.99
    return [0, 1, 0]; // unrelated
  }),
}));

const { getSemanticCacheHit, writeSemanticCache, flushSemanticCacheScope } =
  await import('@/lib/rag/semantic-cache');

/**
 * Semantic cache tests (MASTER_BUILD_SPEC.md §23.6 testing task 3) — "the
 * security case" (different roles must not share a cache entry) is the most
 * important assertion in this file.
 */
describe('semantic cache', () => {
  beforeEach(() => {
    store.clear();
  });

  it('misses when nothing has been cached for this scope', async () => {
    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).toBeNull();
  });

  it('hits for the exact same query after a write-through', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
      'Reset it via the self-service portal. [1]',
      [{ documentId: 'doc-1', title: 'VPN Certificate Renewal' }],
    );

    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).not.toBeNull();
    expect(hit?.answer).toContain('self-service portal');
  });

  it('hits above the similarity threshold for a close paraphrase', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
      'Reset it via the self-service portal. [1]',
      [],
    );

    const hit = await getSemanticCacheHit('vpn cert renewal steps', 'widget', 'end_user');
    expect(hit).not.toBeNull();
  });

  it('misses below the similarity threshold for an unrelated query', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
      'Reset it via the self-service portal. [1]',
      [],
    );

    const hit = await getSemanticCacheHit(
      'completely unrelated question',
      'widget',
      'end_user',
    );
    expect(hit).toBeNull();
  });

  it('SECURITY: does not serve a support_engineer-scoped answer to an end_user', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'support_engineer',
      'Restricted internal answer with sensitive detail. [1]',
      [],
    );

    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).toBeNull();
  });

  it('SECURITY: does not serve a chat-scoped answer to the widget surface', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'chat',
      'end_user',
      'Chat-surface answer.',
      [],
    );

    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).toBeNull();
  });

  it('flushSemanticCacheScope clears cached answers for every role on a surface', async () => {
    await writeSemanticCache(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
      'Cached answer.',
      [],
    );

    await flushSemanticCacheScope('widget');

    const hit = await getSemanticCacheHit(
      'how do I reset a vpn certificate',
      'widget',
      'end_user',
    );
    expect(hit).toBeNull();
  });
});
