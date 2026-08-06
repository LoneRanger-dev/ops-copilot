import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { matchKbChunks } from '@/lib/db/queries/kb.query';
import { embed } from '@/lib/ai/llm/embeddings';
import type { RankedChunk, RetrievalScope } from './types';

/**
 * Dense retrieval (MASTER_BUILD_SPEC.md §23.6 backend task 1). Embeds the
 * query (cache-first via `lib/ai/llm/embeddings.ts`), calls `match_kb_chunks`,
 * and applies the caller's visibility ceiling — the same RLS-backed
 * `max_visibility` parameter every retrieval path uses.
 */
export async function denseRetrieve(
  supabase: SupabaseClient<Database>,
  queryText: string,
  scope: RetrievalScope,
): Promise<RankedChunk[]> {
  const queryEmbedding = await embed(queryText);

  const results = await matchKbChunks(supabase, {
    queryEmbedding,
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
    score: r.similarity,
  }));
}
