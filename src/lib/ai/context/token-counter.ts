import { Tiktoken } from 'js-tiktoken/lite';
import o200k_base from 'js-tiktoken/ranks/o200k_base';

/**
 * Token counting (MASTER_BUILD_SPEC.md §23.5 AI task 3). `o200k_base` is the
 * encoding used by `gpt-4o`/`gpt-4o-mini`/`text-embedding-3-*` — the only
 * models this project configures (§9.2), so one encoding covers every
 * caller. Falls back to a conservative chars/4 estimate if the tokenizer
 * itself throws (e.g. corrupt input), since an estimate that keeps chunking
 * running is better than an unhandled exception in the ingestion pipeline.
 */
let encoder: Tiktoken | undefined;

function getEncoder(): Tiktoken {
  encoder ??= new Tiktoken(o200k_base);
  return encoder;
}

export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return getEncoder().encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

/** The trailing `n` tokens of `text`, decoded back to a string. Used for chunk overlap (§12.3). */
export function takeTrailingTokens(text: string, n: number): string {
  if (!text || n <= 0) return '';
  try {
    const tokens = getEncoder().encode(text);
    return getEncoder().decode(tokens.slice(-n));
  } catch {
    // Fallback mirrors the chars/4 estimate above.
    return text.slice(-n * 4);
  }
}
