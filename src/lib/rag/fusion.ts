/**
 * Reciprocal Rank Fusion (MASTER_BUILD_SPEC.md §12.4). Pure and synchronous
 * — combines any number of already-ranked result sets (e.g. dense + sparse
 * for a single query, or the accumulated result sets across multiple
 * rewritten-query variants in the recursive retriever) without needing
 * calibrated, comparable scores. Only ranks matter.
 *
 * RRF(d) = Σ_r 1 / (k + rank_r(d)), k = 60
 */

export interface RankedItem {
  readonly id: string;
}

export interface FusedResult {
  readonly id: string;
  readonly score: number;
}

const DEFAULT_K = 60;

/** `resultSets[n]` is a list already ordered best-to-worst; rank = 1-based position. */
export function reciprocalRankFusion(
  resultSets: readonly (readonly RankedItem[])[],
  k: number = DEFAULT_K,
): FusedResult[] {
  const scores = new Map<string, number>();

  for (const resultSet of resultSets) {
    resultSet.forEach((item, index) => {
      const rank = index + 1;
      const contribution = 1 / (k + rank);
      scores.set(item.id, (scores.get(item.id) ?? 0) + contribution);
    });
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
