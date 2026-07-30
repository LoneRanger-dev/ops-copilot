import { z } from 'zod';

/**
 * Shared client + server validation schemas for the auth surface
 * (MASTER_BUILD_SPEC.md §23.2 frontend tasks 3-4). Used by both the React
 * Hook Form resolvers (inline errors) and the Server Actions in
 * `actions.ts` (authoritative validation — never trust the client).
 */

const email = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('Enter a valid email address.');

/** ≥12 characters, mixed case, at least one digit — MASTER_BUILD_SPEC §23.2. */
const strongPassword = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a digit.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.').max(120),
  email,
  password: strongPassword,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPassword,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
  factorId: z.string().optional(),
});
export type MfaCodeInput = z.infer<typeof mfaCodeSchema>;

/** Uniform Server Action result — `actions.ts` cannot export non-function values. */
export interface ActionResult {
  readonly ok: boolean;
  readonly message?: string;
}

/**
 * Validates a post-login redirect target against open-redirect abuse.
 * Only same-origin, absolute-path values are honoured; anything else
 * (missing, protocol-relative `//evil.com`, or a full URL) falls back to
 * `/dashboard`.
 */
export function safeNextPath(next: FormDataEntryValue | string | null): string {
  if (typeof next !== 'string') return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://'))
    return '/dashboard';
  return next;
}
