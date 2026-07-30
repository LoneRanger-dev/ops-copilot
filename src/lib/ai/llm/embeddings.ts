import { getOpenAiClient } from './openai';
import {
  getCachedEmbedding,
  getCachedEmbeddings,
  setCachedEmbedding,
} from '@/lib/cache/embedding-cache';
import { env } from '@/config/env';
import { logger } from '@/lib/observability/logger';

/**
 * Embeddings with a content-addressed cache (MASTER_BUILD_SPEC.md §23.5
 * backend task 3). `lib/ai/llm/client.ts` from the spec's file list is
 * `lib/ai/llm/openai.ts` in this repo — created in the earlier chat/widget
 * work and reused here rather than duplicated (`getOpenAiClient()`).
 *
 * No embedding call in this codebase bypasses this module (DoD).
 */

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable =
        error instanceof Error && /429|5\d\d|timeout|network/i.test(error.message);
      if (!isRetryable || attempt === MAX_RETRIES - 1) throw error;
      const backoffMs = 2 ** attempt * 500 + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

async function embedUncached(texts: readonly string[]): Promise<number[][]> {
  const client = getOpenAiClient();
  const response = await withRetry(() =>
    client.embeddings.create(
      { model: env.OPENAI_EMBEDDING_MODEL, input: [...texts] },
      { timeout: env.OPENAI_EMBEDDING_TIMEOUT_MS },
    ),
  );
  return response.data.map((d) => d.embedding);
}

/** Single text, cache-first. */
export async function embed(text: string): Promise<number[]> {
  const cached = await getCachedEmbedding(text);
  if (cached) return cached;

  const [vector] = await embedUncached([text]);
  if (!vector) throw new Error('OpenAI returned no embedding for the given text.');
  await setCachedEmbedding(text, vector);
  return vector;
}

/**
 * Batch embedding: partitions cache hits from misses first, embeds only the
 * misses in batches of 100, writes through, and returns vectors in the same
 * order as the input.
 */
export async function embedBatch(texts: readonly string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const cached = await getCachedEmbeddings(texts);
  const results: (number[] | null)[] = [...cached];
  const missIndices = results
    .map((value, index) => (value === null ? index : -1))
    .filter((index) => index !== -1);

  if (missIndices.length > 0) {
    logger.info(
      { total: texts.length, misses: missIndices.length },
      'Embedding cache partial miss',
    );
  }

  for (let i = 0; i < missIndices.length; i += BATCH_SIZE) {
    const batchIndices = missIndices.slice(i, i + BATCH_SIZE);
    const batchTexts = batchIndices.map((index) => texts[index]!);
    const vectors = await embedUncached(batchTexts);

    await Promise.all(
      batchIndices.map(async (index, batchPosition) => {
        const vector = vectors[batchPosition];
        if (!vector) return;
        results[index] = vector;
        await setCachedEmbedding(texts[index]!, vector);
      }),
    );
  }

  return results.map((vector, index) => {
    if (!vector) throw new Error(`Failed to embed text at index ${index}.`);
    return vector;
  });
}
