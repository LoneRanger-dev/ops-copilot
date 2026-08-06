/**
 * PII redaction (MASTER_BUILD_SPEC.md §16.4). Redaction happens before text
 * leaves the process for OpenAI; the mapping is held only for the duration
 * of the request so the response can be rehydrated for the user. Never
 * persisted — trace step inputs are stored *post*-redaction (§16.4 "never
 * logged, ever").
 */

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  awsKey: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g,
  bearer: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  privateKey:
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
} as const;

type PiiType = keyof typeof PII_PATTERNS;

const PLACEHOLDER_LABEL: Record<PiiType, string> = {
  email: 'EMAIL',
  phone: 'PHONE',
  ssn: 'SSN',
  creditCard: 'CREDIT_CARD',
  ipv4: 'IP',
  awsKey: 'AWS_KEY',
  bearer: 'BEARER_TOKEN',
  privateKey: 'PRIVATE_KEY',
};

// Order matters: privateKey/awsKey/bearer are more specific and must run
// before ipv4/phone, which could otherwise partially match substrings of them.
const PATTERN_ORDER: readonly PiiType[] = [
  'privateKey',
  'awsKey',
  'bearer',
  'email',
  'ssn',
  'creditCard',
  'ipv4',
  'phone',
];

export interface RedactionResult {
  readonly redactedText: string;
  /** Placeholder → original value. Held in memory only, never persisted. */
  readonly mapping: ReadonlyMap<string, string>;
}

/** Replaces each PII match with a stable, type-numbered placeholder (`[EMAIL_1]`, `[IP_2]`). */
export function redactPii(text: string): RedactionResult {
  const mapping = new Map<string, string>();
  const counters: Partial<Record<PiiType, number>> = {};
  let result = text;

  for (const type of PATTERN_ORDER) {
    const pattern = PII_PATTERNS[type];
    result = result.replace(pattern, (match) => {
      const next = (counters[type] ?? 0) + 1;
      counters[type] = next;
      const placeholder = `[${PLACEHOLDER_LABEL[type]}_${next}]`;
      mapping.set(placeholder, match);
      return placeholder;
    });
  }

  return { redactedText: result, mapping };
}

/** Restores placeholders to their original values in a model's response. */
export function rehydratePii(text: string, mapping: ReadonlyMap<string, string>): string {
  let result = text;
  for (const [placeholder, original] of mapping) {
    result = result.split(placeholder).join(original);
  }
  return result;
}

export function containsPii(text: string): boolean {
  return PATTERN_ORDER.some((type) => {
    const pattern = new RegExp(PII_PATTERNS[type].source, PII_PATTERNS[type].flags);
    return pattern.test(text);
  });
}
