import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from '@/lib/rag/fusion';

/** RRF arithmetic tests (MASTER_BUILD_SPEC.md §23.6 testing task 1). */
describe('reciprocalRankFusion', () => {
  it('matches the hand-computed example from §12.4', () => {
    // Doc A rank 1 in both dense and sparse: 1/61 + 1/61 = 0.032786885...
    const dense = [{ id: 'A' }, { id: 'B' }];
    const sparse = [{ id: 'A' }, { id: 'C' }];

    const fused = reciprocalRankFusion([dense, sparse]);
    const a = fused.find((r) => r.id === 'A')!;
    expect(a.score).toBeCloseTo(1 / 61 + 1 / 61, 10);
  });

  it('a document at rank 1 in only one list scores half of one agreeing at rank 1 in both', () => {
    const dense = [{ id: 'A' }, { id: 'B' }];
    const sparse = [{ id: 'C' }, { id: 'D' }];

    const fused = reciprocalRankFusion([dense, sparse]);
    const a = fused.find((r) => r.id === 'A')!;
    expect(a.score).toBeCloseTo(1 / 61, 10);
  });

  it('ranks agreement between retrievers above single-retriever top rank', () => {
    const dense = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    const sparse = [{ id: 'B' }, { id: 'A' }, { id: 'D' }];

    const fused = reciprocalRankFusion([dense, sparse]);
    // A: rank1+rank2, B: rank2+rank1 — same total agreement, both should
    // outrank C (rank3, single list only) and D (rank3, single list only).
    const ids = fused.map((r) => r.id);
    expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('C'));
    expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'));
  });

  it('handles a completely one-sided result (only one retriever returned anything)', () => {
    const dense = [{ id: 'A' }, { id: 'B' }];
    const sparse: { id: string }[] = [];

    const fused = reciprocalRankFusion([dense, sparse]);
    expect(fused).toHaveLength(2);
    expect(fused[0]!.id).toBe('A');
  });

  it('handles a tie by preserving both entries with equal scores', () => {
    const dense = [{ id: 'A' }, { id: 'B' }];
    const sparse = [{ id: 'B' }, { id: 'A' }];

    const fused = reciprocalRankFusion([dense, sparse]);
    expect(fused[0]!.score).toBeCloseTo(fused[1]!.score, 10);
  });

  it('returns an empty array for empty inputs', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });

  it('supports fusing more than two result sets (multi-query-variant recursion)', () => {
    const variant1 = [{ id: 'A' }, { id: 'B' }];
    const variant2 = [{ id: 'A' }, { id: 'C' }];
    const variant3 = [{ id: 'A' }, { id: 'D' }];

    const fused = reciprocalRankFusion([variant1, variant2, variant3]);
    expect(fused[0]!.id).toBe('A');
    expect(fused[0]!.score).toBeCloseTo(3 * (1 / 61), 10);
  });

  it('respects a custom k parameter', () => {
    const dense = [{ id: 'A' }];
    const fused = reciprocalRankFusion([dense], 10);
    expect(fused[0]!.score).toBeCloseTo(1 / 11, 10);
  });
});
