/** Shared ranked-chunk shape used across the retrieval pipeline (§12). */
export interface RankedChunk {
  readonly chunkId: string;
  readonly documentId: string;
  readonly documentTitle: string;
  readonly content: string;
  readonly headingPath: readonly string[];
  readonly score: number;
}

export type MaxVisibility = 'public' | 'internal' | 'restricted';

export interface RetrievalScope {
  readonly orgId: string;
  readonly maxVisibility: MaxVisibility;
  readonly matchCount?: number;
}
