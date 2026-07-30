import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { siteConfig } from '@/config/site';

/**
 * TOTP helpers for demo-mode MFA (MASTER_BUILD_SPEC.md §23.2 — "TOTP MFA
 * enrolment produces a working TOTP code").
 *
 * When Supabase is configured, MFA instead goes through Supabase's native
 * `auth.mfa` API (AAL1/AAL2), which has its own TOTP implementation server
 * side — this module is only reached by the demo-mode path in
 * `src/lib/auth/demo.ts`.
 */

const ISSUER = siteConfig.name;
const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function buildTotp(secret: string, email: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/** `otpauth://` provisioning URI, encoded as an inline SVG QR code. */
export async function buildProvisioningQrSvg(
  secret: string,
  email: string,
): Promise<string> {
  const uri = buildTotp(secret, email).toString();
  return QRCode.toString(uri, { type: 'svg', margin: 1, width: 220 });
}

/** Verifies a 6-digit code, allowing ±1 time-step of clock drift. */
export function verifyTotpCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const delta = buildTotp(secret, 'verify').validate({ token: code, window: 1 });
  return delta !== null;
}
