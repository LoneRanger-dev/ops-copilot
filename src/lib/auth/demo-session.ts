import { env } from '@/config/env';
import type { UserRole } from '@/config/constants';

/**
 * Signed session tokens for demo-mode authentication.
 *
 * This module is intentionally dependency-free and uses only the Web Crypto
 * API (`crypto.subtle`), so it runs unchanged in the Edge runtime
 * (`src/middleware.ts`) and in Node (Server Actions). It is NOT used when
 * Supabase is configured — see `src/lib/auth/server.ts` for the branch point.
 *
 * Format: `base64url(json payload).base64url(hmac-sha256 signature)`.
 * This is deliberately not a JWT library: the payload shape is fixed and
 * internal to this app, so a minimal hand-rolled HMAC envelope has a smaller
 * attack surface than a general-purpose JWT parser.
 */

export interface DemoSessionPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: UserRole;
  readonly orgId: string;
  readonly fullName: string;
  readonly exp: number; // epoch seconds
}

export interface DemoPendingMfaPayload {
  readonly sub: string;
  readonly exp: number; // epoch seconds
}

export const SESSION_COOKIE = 'oc_session';
export const MFA_PENDING_COOKIE = 'oc_mfa_pending';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, sliding
const MFA_PENDING_TTL_SECONDS = 60 * 5; // 5 minutes

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.DEMO_AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: object): Promise<string> {
  const encoder = new TextEncoder();
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

async function verify<T>(token: string): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts as [string, string];

  const encoder = new TextEncoder();
  const key = await getHmacKey();
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    fromBase64Url(sigB64),
    encoder.encode(payloadB64),
  );
  if (!valid) return null;

  try {
    const decoder = new TextDecoder();
    const json = decoder.decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(json) as T & { exp: number };
    if (parsed.exp * 1000 < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function signSessionToken(
  claims: Omit<DemoSessionPayload, 'exp'>,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return sign({ ...claims, exp });
}

export async function verifySessionToken(
  token: string,
): Promise<DemoSessionPayload | null> {
  return verify<DemoSessionPayload>(token);
}

export async function signMfaPendingToken(sub: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MFA_PENDING_TTL_SECONDS;
  return sign({ sub, exp } satisfies DemoPendingMfaPayload);
}

export async function verifyMfaPendingToken(
  token: string,
): Promise<DemoPendingMfaPayload | null> {
  return verify<DemoPendingMfaPayload>(token);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
export const MFA_PENDING_MAX_AGE_SECONDS = MFA_PENDING_TTL_SECONDS;
