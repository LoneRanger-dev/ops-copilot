import { describe, expect, it } from 'vitest';
import { redactPii, rehydratePii, containsPii } from '@/lib/ai/guardrails/pii-redactor';

/** PII redactor tests (MASTER_BUILD_SPEC.md §23.6 testing task 6). */
describe('redactPii', () => {
  it('redacts an email address', () => {
    const { redactedText } = redactPii('Contact me at priya@opscopilot.demo please.');
    expect(redactedText).toContain('[EMAIL_1]');
    expect(redactedText).not.toContain('priya@opscopilot.demo');
  });

  it('redacts a phone number', () => {
    const { redactedText } = redactPii('Call me at 415-555-0199 tomorrow.');
    expect(redactedText).toContain('[PHONE_1]');
  });

  it('redacts an SSN', () => {
    const { redactedText } = redactPii('SSN on file: 123-45-6789.');
    expect(redactedText).toContain('[SSN_1]');
    expect(redactedText).not.toContain('123-45-6789');
  });

  it('redacts a credit card number', () => {
    const { redactedText } = redactPii('Card: 4111 1111 1111 1111');
    expect(redactedText).toContain('[CREDIT_CARD_1]');
  });

  it('redacts an IPv4 address', () => {
    const { redactedText } = redactPii('The server at 10.20.30.40 is unreachable.');
    expect(redactedText).toContain('[IP_1]');
  });

  it('redacts an AWS access key', () => {
    const { redactedText } = redactPii('Key: AKIAABCDEFGHIJKLMNOP');
    expect(redactedText).toContain('[AWS_KEY_1]');
  });

  it('redacts a bearer token', () => {
    const { redactedText } = redactPii('Authorization: Bearer abc123.def456-ghi');
    expect(redactedText).toContain('[BEARER_TOKEN_1]');
  });

  it('redacts a private key block', () => {
    const key =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJ...\n-----END RSA PRIVATE KEY-----';
    const { redactedText } = redactPii(key);
    expect(redactedText).toContain('[PRIVATE_KEY_1]');
  });

  it('numbers multiple matches of the same type stably in order', () => {
    const { redactedText } = redactPii('Emails: a@example.com and b@example.com');
    expect(redactedText).toContain('[EMAIL_1]');
    expect(redactedText).toContain('[EMAIL_2]');
  });

  it('never redacts a ServiceNow incident number or error code', () => {
    const { redactedText } = redactPii('See INC0012345 for error code E-4471.');
    expect(redactedText).toBe('See INC0012345 for error code E-4471.');
  });

  it('round-trips through redact then rehydrate', () => {
    const original = 'Reach me at priya@opscopilot.demo or 415-555-0199.';
    const { redactedText, mapping } = redactPii(original);
    expect(rehydratePii(redactedText, mapping)).toBe(original);
  });

  it('containsPii detects PII presence without redacting', () => {
    expect(containsPii('My email is a@example.com')).toBe(true);
    expect(containsPii('Ticket INC0012345 is resolved')).toBe(false);
  });
});
