/**
 * Deterministic guardrail rules (MASTER_BUILD_SPEC.md §21.4). Run in code
 * before any model call — fast, free, and not subject to model judgement.
 */

export const FORBIDDEN_OUTPUT_PATTERNS: readonly RegExp[] = [
  /sk-[A-Za-z0-9]{20,}/, // OpenAI keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // private keys
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWTs
  /\b(AKIA|ASIA)[0-9A-Z]{16}\b/, // AWS keys
  /password\s*[:=]\s*["']?[^\s"']{6,}/i, // literal passwords
];

/** Always classified dangerous, overriding the model (§10.5.11). */
export const ALWAYS_DANGEROUS: readonly RegExp[] = [
  /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bDELETE\s+FROM\b(?![\s\S]{0,80}\bWHERE\b)/i, // DELETE without WHERE
  /\brm\s+-rf?\b/,
  /\bkubectl\s+delete\b/,
  /\bgit\s+push\s+(-f|--force)\b/,
  /\bchmod\s+777\b/,
  /\bGRANT\s+ALL\b/i,
  /\bflushall\b/i,
  /\bALTER\s+USER\b/i,
];

/** The assistant refuses these outright, whatever the user's role. */
export const NEVER_ASSIST = [
  'bypassing authentication or authorisation',
  'disabling audit logging or monitoring',
  'extracting or transmitting credentials',
  "accessing another user's data without authorisation",
  'circumventing rate limits or security controls',
] as const;

export const HARD_RULES = {
  FORBIDDEN_OUTPUT_PATTERNS,
  ALWAYS_DANGEROUS,
  NEVER_ASSIST,
} as const;

export function containsForbiddenOutput(text: string): boolean {
  return FORBIDDEN_OUTPUT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isAlwaysDangerous(actionText: string): boolean {
  return ALWAYS_DANGEROUS.some((pattern) => pattern.test(actionText));
}
