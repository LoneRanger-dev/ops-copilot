import { env } from '@/config/env';

/**
 * AI model assignment, token budgets, and thresholds.
 * Server-only — depends on `src/config/env.ts`.
 *
 * Model choices follow MASTER_BUILD_SPEC section 9.2. The cheap model handles
 * routing, classification, reranking, validation, and the floating widget,
 * which is the overwhelming majority of calls — so that single choice dominates
 * total spend.
 */

export const AI_MODELS = {
  primary: env.OPENAI_MODEL_PRIMARY,
  fast: env.OPENAI_MODEL_FAST,
  fallback: env.OPENAI_MODEL_FALLBACK,
  embedding: env.OPENAI_EMBEDDING_MODEL,
} as const;

export const EMBEDDING_DIMENSIONS = env.EMBEDDING_DIMENSIONS;

/**
 * Context window budget (section 9.4). The Context Assembler evicts by priority
 * to stay under the ceiling, so the system degrades gracefully instead of
 * erroring at the provider.
 */
export const TOKEN_BUDGET = {
  total: env.MAX_CONTEXT_TOKENS,
  maxOutput: env.MAX_OUTPUT_TOKENS,
  system: 800,
  guardrails: 400,
  user: 200,
  currentMessage: 1000,
  retrieved: 5000,
  tools: 2000,
  memory: 1200,
  conversation: 1400,
} as const;

/** Loop caps (section 20.7). Every loop is bounded. */
export const LOOP_LIMITS = {
  maxAgentSteps: env.MAX_AGENT_STEPS,
  maxRetrievalPasses: env.MAX_RETRIEVAL_PASSES,
  maxPlannerCycles: 2,
  maxValidationAttempts: 2,
  agentDeadlineMs: env.AGENT_DEADLINE_MS,
  widgetDeadlineMs: env.WIDGET_DEADLINE_MS,
} as const;

/** Request timeouts, milliseconds (section 8.7). No call is ever unbounded. */
export const AI_TIMEOUTS = {
  chatMs: env.OPENAI_TIMEOUT_MS,
  embeddingMs: env.OPENAI_EMBEDDING_TIMEOUT_MS,
} as const;

/** Maximum concurrent OpenAI calls per process (bulkhead). */
export const AI_MAX_CONCURRENCY = env.OPENAI_MAX_CONCURRENCY;

/** Quality thresholds (sections 10.5.10, 12.8). */
export const AI_THRESHOLDS = {
  ragMinConfidence: env.RAG_MIN_CONFIDENCE,
  semanticCacheSimilarity: env.SEMANTIC_CACHE_THRESHOLD,
} as const;
