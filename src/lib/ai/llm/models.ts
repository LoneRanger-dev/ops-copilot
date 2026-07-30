/**
 * Model registry (MASTER_BUILD_SPEC.md §23.5 AI task 1, §9.2). IDs read from
 * `src/config/env.ts` so an environment override changes the model without
 * a code change; context limits and pricing are metadata about whichever
 * model is currently configured for each role, used for cost accounting in
 * `lib/ai/llm/usage.ts` and `lib/ai/context/token-counter.ts`.
 */
import { env } from '@/config/env';

export interface ModelInfo {
  readonly id: string;
  readonly contextTokens: number;
  /** USD per 1,000 tokens. */
  readonly inputPricePer1k: number;
  readonly outputPricePer1k: number;
}

// Pricing as published for gpt-4o / gpt-4o-mini / text-embedding-3-small at
// the time this was written. Revisit if OpenAI's price sheet changes.
const KNOWN_MODELS: Record<string, Omit<ModelInfo, 'id'>> = {
  'gpt-4o': { contextTokens: 128_000, inputPricePer1k: 0.0025, outputPricePer1k: 0.01 },
  'gpt-4o-mini': {
    contextTokens: 128_000,
    inputPricePer1k: 0.00015,
    outputPricePer1k: 0.0006,
  },
  'text-embedding-3-small': {
    contextTokens: 8191,
    inputPricePer1k: 0.00002,
    outputPricePer1k: 0,
  },
  'text-embedding-3-large': {
    contextTokens: 8191,
    inputPricePer1k: 0.00013,
    outputPricePer1k: 0,
  },
};

function resolveModel(id: string): ModelInfo {
  const known = KNOWN_MODELS[id];
  if (known) return { id, ...known };
  // Unknown model configured via env override: fail open with conservative
  // defaults rather than throwing — cost accounting degrades, the app doesn't.
  return { id, contextTokens: 128_000, inputPricePer1k: 0.0025, outputPricePer1k: 0.01 };
}

export const MODELS = {
  primary: resolveModel(env.OPENAI_MODEL_PRIMARY),
  fast: resolveModel(env.OPENAI_MODEL_FAST),
  fallback: resolveModel(env.OPENAI_MODEL_FALLBACK),
  embedding: resolveModel(env.OPENAI_EMBEDDING_MODEL),
} as const;
