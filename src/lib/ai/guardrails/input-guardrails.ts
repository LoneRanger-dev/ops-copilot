import { getOpenAiClient } from '@/lib/ai/llm/openai';
import { scanForInjection } from './injection-detector';
import { redactPii, type RedactionResult } from './pii-redactor';
import { logger } from '@/lib/observability/logger';

/**
 * Input guardrail pipeline (MASTER_BUILD_SPEC.md §21.1, §21.2). Executed in
 * order; any block short-circuits the rest. Fail-closed (§21.7): if a
 * guardrail itself errors, the request is denied, not passed through.
 */

const MAX_INPUT_CHARS = 8000;

const CONTROL_CHAR_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

const SCOPE_KEYWORDS =
  /\b(incident|ticket|inc\d+|error|troubleshoot|vpn|password|login|server|network|outage|deploy|database|disk|certificate|sso|kb|knowledge base|it |help desk|reset|access|permission|configuration|bug|issue|problem)\b/i;
const GREETING_RE =
  /^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)\b/i;

export type GuardrailBlockReason =
  | 'length_or_encoding'
  | 'injection_detected'
  | 'moderation_flagged'
  | 'guardrail_unavailable';

export interface GuardrailPassResult {
  readonly passed: true;
  /** Redacted text — this is what MUST be sent to the model. */
  readonly text: string;
  readonly piiMapping: RedactionResult['mapping'];
  readonly offTopic: boolean;
  readonly injectionFlaggedForReview: boolean;
}

export interface GuardrailBlockResult {
  readonly passed: false;
  readonly reason: GuardrailBlockReason;
  readonly message: string;
}

export type GuardrailResult = GuardrailPassResult | GuardrailBlockResult;

function isOffTopic(text: string): boolean {
  if (GREETING_RE.test(text)) return false;
  return !SCOPE_KEYWORDS.test(text);
}

/**
 * Runs guardrails 1-4 (length/encoding, PII redaction, injection detection,
 * moderation) and computes the scope signal for guardrail 5 — the scope
 * check itself is not a block (§21.2: "off-topic input is not an error"),
 * so the caller decides how to respond to `offTopic: true`.
 */
export async function runInputGuardrails(rawText: string): Promise<GuardrailResult> {
  try {
    // 1. Length & encoding
    if (
      rawText.length === 0 ||
      rawText.length > MAX_INPUT_CHARS ||
      CONTROL_CHAR_RE.test(rawText) ||
      rawText.includes('\u0000')
    ) {
      return {
        passed: false,
        reason: 'length_or_encoding',
        message: `Message must be between 1 and ${MAX_INPUT_CHARS} characters.`,
      };
    }

    // 2. PII redaction — never blocks, only transforms.
    const { redactedText, mapping } = redactPii(rawText);

    // 3. Injection detection
    const injection = scanForInjection(redactedText);
    if (injection.blocked) {
      logger.warn(
        { score: injection.score, patterns: injection.matchedPatterns },
        'Injection blocked',
      );
      return {
        passed: false,
        reason: 'injection_detected',
        message: 'This request was blocked by a safety guardrail.',
      };
    }

    // 4. Moderation
    try {
      const moderation = await getOpenAiClient().moderations.create({
        input: redactedText,
      });
      if (moderation.results.some((r) => r.flagged)) {
        logger.warn(
          { categories: moderation.results[0]?.categories },
          'Moderation blocked',
        );
        return {
          passed: false,
          reason: 'moderation_flagged',
          message: 'This request was blocked by a safety guardrail.',
        };
      }
    } catch (error) {
      // Fail closed (§21.7): a broken moderation call denies rather than passing through.
      logger.error({ err: error }, 'Moderation check failed — denying request');
      return {
        passed: false,
        reason: 'guardrail_unavailable',
        message:
          'This request could not be safety-checked right now. Please try again shortly.',
      };
    }

    // 5. Scope check — computed, not enforced here (not an error, §21.2).
    return {
      passed: true,
      text: redactedText,
      piiMapping: mapping,
      offTopic: isOffTopic(redactedText),
      injectionFlaggedForReview: injection.flaggedForReview,
    };
  } catch (error) {
    logger.error({ err: error }, 'Guardrail evaluation failed — denying request');
    return {
      passed: false,
      reason: 'guardrail_unavailable',
      message: 'This request could not be processed right now. Please try again shortly.',
    };
  }
}

export const OFF_TOPIC_REDIRECT =
  "I'm an IT support assistant — I can help with incidents, tickets, troubleshooting, and " +
  'knowledge base questions. Is there something along those lines I can help with?';
