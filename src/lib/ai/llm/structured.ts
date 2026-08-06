import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

/**
 * Structured output contract (MASTER_BUILD_SPEC.md §9.3). Every non-streaming
 * model call in this codebase MUST go through this function — `JSON.parse`
 * on a raw completion is a lint-enforced prohibition (no other module in
 * `lib/ai/` imports the raw `openai` SDK's chat-completions API for a
 * structured call).
 *
 * Per-step AI trace persistence (`ai_traces`/`ai_trace_steps`, §9.5) is a
 * Phase 7 concern — it belongs to the Task Manager that will call this
 * function from inside a bounded, traced orchestration loop. Phase 6's
 * callers (the Knowledge Base, Retriever, and reranker) are single model
 * calls with no orchestrator yet to attach a trace to.
 */
export interface StructuredCallArgs<T extends z.ZodTypeAny> {
  readonly schema: T;
  readonly system: string;
  readonly prompt: string;
  readonly model: string;
  readonly temperature?: number;
  readonly maxRetries?: number;
}

export async function callStructured<T extends z.ZodTypeAny>({
  schema,
  system,
  prompt,
  model,
  temperature = 0,
  maxRetries = 2,
}: StructuredCallArgs<T>): Promise<z.infer<T>> {
  const { object } = await generateObject({
    model: openai(model),
    schema,
    system,
    prompt,
    temperature,
    maxRetries,
  });
  return object as z.infer<T>;
}
