import { describe, expect, it, vi, beforeEach } from 'vitest';

const callStructuredMock = vi.fn();
vi.mock('@/lib/ai/llm/structured', () => ({ callStructured: callStructuredMock }));

const { rerank } = await import('@/lib/rag/reranker');
import type { RankedChunk } from '@/lib/rag/types';

function chunk(id: string, score = 0.5): RankedChunk {
  return {
    chunkId: id,
    documentId: `doc-${id}`,
    documentTitle: `Doc ${id}`,
    content: `Content for ${id}`,
    headingPath: ['Section'],
    score,
  };
}

/** Reranker tests (MASTER_BUILD_SPEC.md §23.6 testing task 2). */
describe('rerank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('orders results by the model-assigned relevance score', async () => {
    callStructuredMock.mockResolvedValue({
      rankings: [
        { chunkId: 'a', relevance: 4, reason: 'somewhat relevant' },
        { chunkId: 'b', relevance: 9, reason: 'highly relevant' },
      ],
    });

    const results = await rerank('query', [chunk('a'), chunk('b')]);
    expect(results.map((r) => r.chunkId)).toEqual(['b', 'a']);
  });

  it('discards results scoring below relevance 3', async () => {
    callStructuredMock.mockResolvedValue({
      rankings: [
        { chunkId: 'a', relevance: 2, reason: 'weak' },
        { chunkId: 'b', relevance: 8, reason: 'strong' },
      ],
    });

    const results = await rerank('query', [chunk('a'), chunk('b')]);
    expect(results.map((r) => r.chunkId)).toEqual(['b']);
  });

  it('tolerates a malformed model response by falling back to input order', async () => {
    callStructuredMock.mockRejectedValue(new Error('schema validation failed'));

    const input = [chunk('a'), chunk('b')];
    const results = await rerank('query', input);
    expect(results).toEqual(input);
  });

  it('returns an empty array for empty input without calling the model', async () => {
    const results = await rerank('query', []);
    expect(results).toEqual([]);
    expect(callStructuredMock).not.toHaveBeenCalled();
  });

  it('can discard everything if all candidates score below threshold', async () => {
    callStructuredMock.mockResolvedValue({
      rankings: [{ chunkId: 'a', relevance: 1, reason: 'irrelevant' }],
    });

    const results = await rerank('query', [chunk('a')]);
    expect(results).toHaveLength(0);
  });
});
