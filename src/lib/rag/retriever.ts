import { isConfigured } from '@/config/env';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { hybridSearchKbChunks } from '@/lib/db/queries/kb.query';
import { embed } from '@/lib/ai/llm/embeddings';
import { rerank } from './reranker';
import type { RankedChunk, RetrievalScope } from './types';
import { getSemanticCacheHit } from './semantic-cache';
import { searchKb as demoSearchKb } from './demo-kb';
import { incrCounter } from '@/lib/observability/metrics';

/** Top-level hybrid retriever used by widget and chat surfaces (Phase 6). */
export async function hybridRetrieve(
  query: string,
  scope: RetrievalScope,
  surface: 'widget' | 'chat',
  role: string,
  limit = 3,
): Promise<RankedChunk[]> {
  // Semantic cache short-circuits the retrieval if present and similar enough.
  if (isConfigured.redis) {
    try {
      const hit = await getSemanticCacheHit(
        query,
        surface,
        role as unknown as import('@/config/constants').UserRole,
      );
      if (hit) {
        incrCounter('semantic_cache.hit');
        // Convert cached citations into a minimal ranked-chunk shape so
        // callers can render sources uniformly.
        return hit.citations.slice(0, limit).map((c, i) => ({
          chunkId: `${c.documentId}:${i}`,
          documentId: c.documentId,
          documentTitle: c.title,
          content: '',
          headingPath: [],
          score: hit.similarity,
        }));
      }
      incrCounter('semantic_cache.miss');
    } catch (_e) {
      incrCounter('semantic_cache.error');
      // Redis read errors are non-fatal — fall through to live retrieval.
    }
  }

  // If no Postgres/Supabase configured, fall back to the in-repo demo KB.
  if (!isConfigured.database || !isConfigured.supabase) {
    incrCounter('retriever.demo_fallback');
    const docs = demoSearchKb(query, limit);
    return docs.map((d, i) => ({
      chunkId: `${d.id}:${i}`,
      documentId: d.id,
      documentTitle: d.title,
      content: d.content,
      headingPath: [],
      score: 1 - i * 0.1,
    }));
  }

  // Real hybrid retrieval path: embed, call the hybrid RPC, then rerank.
  const supabase = await createRouteHandlerSupabaseClient();
  incrCounter('retriever.db_path');
  const queryEmbedding = await embed(query);
  incrCounter('retriever.embed_calls');

  const raw = await hybridSearchKbChunks(supabase, {
    queryEmbedding,
    queryText: query,
    matchCount: Math.max(limit, 20),
    orgId: scope.orgId,
    maxVisibility: scope.maxVisibility,
  });

  const candidates: RankedChunk[] = raw
    .slice(0, Math.max(limit, raw.length))
    .map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      content: r.content,
      headingPath: r.headingPath ?? [],
      score: r.rrfScore ?? 0,
    }));

  // Rerank with a cross-encoder for final ordering; best-effort if the model fails.
  try {
    incrCounter('retriever.rpc_calls');
    incrCounter('retriever.candidates', candidates.length);
    const reranked = await rerank(query, candidates);
    incrCounter('retriever.rerank_returned', reranked.length);
    return reranked.slice(0, limit);
  } catch (_e) {
    incrCounter('retriever.rerank_failed');
    return candidates.slice(0, limit);
  }
}

export default hybridRetrieve;
