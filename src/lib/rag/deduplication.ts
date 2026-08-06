/**
 * Deduplication (MASTER_BUILD_SPEC.md §23.6 files to create). The recursive
 * retriever and multi-variant fusion can surface the same chunk more than
 * once across passes/variants; this keeps the highest-scoring occurrence.
 */
export interface ScoredChunk {
  readonly chunkId: string;
  readonly score: number;
}

export function dedupeByChunkId<T extends ScoredChunk>(chunks: readonly T[]): T[] {
  const best = new Map<string, T>();

  for (const chunk of chunks) {
    const existing = best.get(chunk.chunkId);
    if (!existing || chunk.score > existing.score) {
      best.set(chunk.chunkId, chunk);
    }
  }

  return Array.from(best.values()).sort((a, b) => b.score - a.score);
}
