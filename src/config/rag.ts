import { env } from '@/config/env';

/**
 * Chunking parameters (MASTER_BUILD_SPEC.md §12.3). `targetTokens` and
 * `overlapTokens` come from the environment (already validated by
 * `src/config/env.ts`, defaults 800/120); `minTokens`/`maxTokens` are fixed
 * constants per the spec's own literal example — the spec ties only the
 * first two to configuration.
 */
export const CHUNK_CONFIG = {
  targetTokens: env.CHUNK_SIZE_TOKENS,
  overlapTokens: env.CHUNK_OVERLAP_TOKENS,
  minTokens: 200,
  maxTokens: 1200, // hard ceiling incl. preserved code blocks
  separators: ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', ' '] as const,
  preserveCodeBlocks: true,
  prependHeadingPath: true,
} as const;

/** Minimum rerank/retrieval confidence — read here so RAG modules share one import. */
export const RAG_MIN_CONFIDENCE = env.RAG_MIN_CONFIDENCE;
export const MAX_RETRIEVAL_PASSES = env.MAX_RETRIEVAL_PASSES;
