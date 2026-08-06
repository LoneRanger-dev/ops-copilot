import { z } from 'zod';
import { callStructured } from '@/lib/ai/llm/structured';
import {
  buildRerankerPrompt,
  buildRerankerSystemPrompt,
} from '@/lib/ai/prompts/reranker.prompt';
import { MODELS } from '@/lib/ai/llm/models';
import type { RankedChunk } from './types';
import { incrCounter } from '@/lib/observability/metrics';

/**
 * LLM cross-encoder reranking (MASTER_BUILD_SPEC.md §12.5, §23.6 backend
 * task 4). RRF produces good candidates; it does not understand the query.
 * This pass over the top 20 produces the final ordering. Discards anything
 * scoring below relevance 3, even if that leaves fewer than 8.
 */

export const RerankSchema = z.object({
  rankings: z.array(
    z.object({
      chunkId: z.string(),
      relevance: z.number().min(0).max(10),
      reason: z.string().max(120),
    }),
  ),
});

const MIN_RELEVANCE = 3;
const MAX_CANDIDATES = 20;

export async function rerank(
  query: string,
  candidates: readonly RankedChunk[],
): Promise<RankedChunk[]> {
  incrCounter('reranker.calls');
  if (candidates.length === 0) return [];

  incrCounter('reranker.candidates', candidates.length);

  const limited = candidates.slice(0, MAX_CANDIDATES);

  let result: z.infer<typeof RerankSchema>;
  try {
    incrCounter('reranker.model_calls');
    const start = Date.now();
    result = await callStructured({
      schema: RerankSchema,
      system: buildRerankerSystemPrompt(),
      prompt: buildRerankerPrompt(query, limited),
      model: MODELS.fast.id,
      temperature: 0,
    });
    const elapsed = Date.now() - start;
    // record latency in ms
    try {
      // dynamic import to avoid circular deps in some test setups
      const metrics = await import('@/lib/observability/metrics');
      metrics.observeHistogram('reranker_latency_ms', elapsed);
    } catch {
      // ignore
    }
  } catch {
    incrCounter('reranker.fallbacks');
    // Malformed/failed model response: fall back to the pre-rerank (RRF)
    // ordering rather than crashing the request — reranking is a quality
    // improvement, not a correctness dependency.
    return limited;
  }

  const relevanceByChunkId = new Map(
    result.rankings.map((r) => [r.chunkId, r.relevance]),
  );
  const filtered = limited
    .filter((chunk) => (relevanceByChunkId.get(chunk.chunkId) ?? 0) >= MIN_RELEVANCE)
    .map((chunk) => ({
      ...chunk,
      score: relevanceByChunkId.get(chunk.chunkId) ?? chunk.score,
    }));

  const discarded = limited.length - filtered.length;
  if (discarded > 0) incrCounter('reranker.discarded', discarded);

  const resultSorted = filtered.sort((a, b) => b.score - a.score);
  incrCounter('reranker.returned', resultSorted.length);
  return resultSorted;
}
