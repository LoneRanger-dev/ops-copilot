import type { Tables } from '@/lib/db/types';

export type KbDocument = Tables<'kb_documents'>;
export type KbDocumentVersion = Tables<'kb_document_versions'>;
export type KbChunk = Tables<'kb_chunks'>;

export interface HybridSearchResult {
  readonly chunkId: string;
  readonly documentId: string;
  readonly content: string;
  readonly headingPath: readonly string[];
  readonly documentTitle: string;
  readonly denseRank: number | null;
  readonly sparseRank: number | null;
  readonly rrfScore: number;
}
