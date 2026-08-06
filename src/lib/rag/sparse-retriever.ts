import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { matchKbChunksSparse } from '@/lib/db/queries/kb.query';
import type { RankedChunk, RetrievalScope } from './types';

/**
 * Sparse retrieval (MASTER_BUILD_SPEC.md §23.6 backend task 2). Postgres
 * full-text search (`websearch_to_tsquery` + `ts_rank_cd`, `016_sparse_search.sql`)
 * — strong at exact identifiers and error codes that dense retrieval embeds
 * as noise (§12.4).
 */
export async function sparseRetrieve(
  supabase: SupabaseClient<Database>,
  queryText: string,
  scope: RetrievalScope,
): Promise<RankedChunk[]> {
  const results = await matchKbChunksSparse(supabase, {
    queryText,
    orgId: scope.orgId,
    maxVisibility: scope.maxVisibility,
    ...(scope.matchCount !== undefined ? { matchCount: scope.matchCount } : {}),
  });

  return results.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    content: r.content,
    headingPath: r.headingPath,
    score: r.rank,
  }));
}
