'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { env, isConfigured } from '@/config/env';
import { logger } from '@/lib/observability/logger';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import {
  demoBeginMfaEnrollment,
  demoConfirmMfaEnrollment,
  demoConsumePasswordResetToken,
  demoCreatePasswordResetToken,
  demoSignUp,
  demoUpdatePassword,
  demoVerifyCredentials,
  findDemoUserById,
} from './demo-store';
import {
  MFA_PENDING_COOKIE,
  MFA_PENDING_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signMfaPendingToken,
  signSessionToken,
  verifyMfaPendingToken,
} from './demo-session';
import { buildProvisioningQrSvg, generateTotpSecret, verifyTotpCode } from './mfa';
import {
  type ActionResult,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  mfaCodeSchema,
  resetPasswordSchema,
  safeNextPath,
  signupSchema,
} from './schemas';
import type { DemoUser } from './demo-store';
import { requireUser } from './server';

const GENERIC_LOGIN_ERROR: ActionResult = {
  ok: false,
  message: 'Invalid email or password.',
};

function firstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Invalid input.';
}

/**
 * `next.config.ts` enables `typedRoutes`, which statically types every route
 * literal. Redirect targets built at runtime (the sanitised `next` query
 * param, MFA URLs with query strings) cannot be verified statically — this
 * is the single, explicit cast point rather than scattering `as Route`
 * throughout the file. `safeNextPath()` is what actually guards against an
 * open redirect; this cast is a type-system accommodation only.
 */
function toRoute(path: string): Route {
  return path as Route;
}

async function setDemoSessionCookie(user: DemoUser): Promise<void> {
  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
    fullName: user.fullName,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  store.delete(MFA_PENDING_COOKIE);
}

async function setDemoMfaPendingCookie(userId: string): Promise<void> {
  const token = await signMfaPendingToken(userId);
  const store = await cookies();
  store.set(MFA_PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: MFA_PENDING_MAX_AGE_SECONDS,
  });
}

async function requireDemoPendingUser(): Promise<DemoUser> {
  const store = await cookies();
  const token = store.get(MFA_PENDING_COOKIE)?.value;
  const payload = token ? await verifyMfaPendingToken(token) : null;
  const user = payload ? findDemoUserById(payload.sub) : undefined;
  if (!user) throw new Error('MFA session expired. Please sign in again.');
  return user;
}

/** Email/password sign-in. Redirects on success; returns an error otherwise. */
export async function signInAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };
  const { email: loginEmail, password } = parsed.data;
  const next = safeNextPath(formData.get('next'));

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error) {
      logger.warn({ email: loginEmail }, 'Supabase sign-in failed');
      return GENERIC_LOGIN_ERROR;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      redirect(toRoute(`/mfa?next=${encodeURIComponent(next)}`));
    }
    redirect(toRoute(next));
  }

  const user = demoVerifyCredentials(loginEmail, password);
  if (!user) return GENERIC_LOGIN_ERROR;

  // Admin MUST enrol MFA before proceeding; everyone else with MFA enrolled
  // must challenge it. Everyone else proceeds directly.
  if (user.role === 'admin' && !user.mfaEnrolled) {
    await setDemoMfaPendingCookie(user.id);
    redirect(toRoute(`/mfa?mode=enroll&next=${encodeURIComponent(next)}`));
  }
  if (user.mfaEnrolled) {
    await setDemoMfaPendingCookie(user.id);
    redirect(toRoute(`/mfa?mode=challenge&next=${encodeURIComponent(next)}`));
  }

  await setDemoSessionCookie(user);
  redirect(toRoute(next));
}

/** Email/password sign-up. Creates the account at role `end_user`. */
export async function signUpAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };
  const { fullName, email: signupEmail, password } = parsed.data;
  const next = safeNextPath(formData.get('next'));

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { ok: false, message: error.message };
    if (data.session) redirect(toRoute(next));
    return {
      ok: true,
      message: 'Check your email to confirm your account, then sign in.',
    };
  }

  const result = demoSignUp(signupEmail, password, fullName);
  if (!result.ok)
    return { ok: false, message: 'An account with this email already exists.' };

  await setDemoSessionCookie(result.user);
  redirect(toRoute(next));
}

/** Clears the session server-side (Supabase and/or demo cookies). */
export async function signOutAction(): Promise<never> {
  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(MFA_PENDING_COOKIE);
  redirect('/login');
}

/**
 * Always returns a generic success message — never confirms whether the
 * email exists (MASTER_BUILD_SPEC §16 threat model: no user enumeration).
 */
export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };
  const { email: targetEmail } = parsed.data;

  const generic: ActionResult = {
    ok: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback?next=/reset-password`,
    });
    return generic;
  }

  const token = demoCreatePasswordResetToken(targetEmail);
  if (!token) return generic; // do not reveal non-existence

  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  logger.info(
    { email: targetEmail, resetUrl },
    'Demo-mode password reset link generated',
  );

  // Demo mode has no email provider (§ IMPLEMENTATION_OVERRIDE.md) — the link
  // is surfaced directly in the response so the flow is testable end to end.
  return env.DEMO_MODE
    ? {
        ok: true,
        message: `Demo mode has no email provider. Your reset link: ${resetUrl}`,
      }
    : generic;
}

/** Consumes a reset token (demo mode) or updates the recovery session's password (Supabase). */
export async function resetPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (isConfigured.supabase) {
    const password = formData.get('password');
    const parsed = resetPasswordSchema.shape.password.safeParse(password);
    if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };

    const supabase = await createRouteHandlerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    if (error) return { ok: false, message: error.message };
    redirect('/login');
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };

  const user = demoConsumePasswordResetToken(parsed.data.token);
  if (!user) return { ok: false, message: 'This reset link is invalid or has expired.' };

  demoUpdatePassword(user.id, parsed.data.password);
  redirect('/login');
}

/** Begins TOTP enrolment for the user currently mid-sign-in (demo mode only). */
export async function beginDemoMfaEnrollmentAction(): Promise<{
  secret: string;
  qrSvg: string;
}> {
  const user = await requireDemoPendingUser();
  const secret = user.pendingMfaSecret ?? generateTotpSecret();
  if (!user.pendingMfaSecret) demoBeginMfaEnrollment(user.id, secret);
  const qrSvg = await buildProvisioningQrSvg(secret, user.email);
  return { secret, qrSvg };
}

/** Confirms enrolment: verifies the code, marks MFA enrolled, issues the full session. */
export async function confirmDemoMfaEnrollmentAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = mfaCodeSchema.safeParse({ code: formData.get('code') });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };
  const next = safeNextPath(formData.get('next'));

  const user = await requireDemoPendingUser();
  if (
    !user.pendingMfaSecret ||
    !verifyTotpCode(user.pendingMfaSecret, parsed.data.code)
  ) {
    return {
      ok: false,
      message: 'Incorrect code. Check your authenticator app and try again.',
    };
  }

  demoConfirmMfaEnrollment(user.id);
  await setDemoSessionCookie(user);
  redirect(toRoute(next));
}

/** Verifies a TOTP challenge for an already-enrolled user, then issues the full session. */
export async function challengeDemoMfaAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = mfaCodeSchema.safeParse({ code: formData.get('code') });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };
  const next = safeNextPath(formData.get('next'));

  const user = await requireDemoPendingUser();
  if (!user.mfaSecret || !verifyTotpCode(user.mfaSecret, parsed.data.code)) {
    return {
      ok: false,
      message: 'Incorrect code. Check your authenticator app and try again.',
    };
  }

  await setDemoSessionCookie(user);
  redirect(toRoute(next));
}

/** Supabase-mode MFA enrolment: returns the factor id + QR/secret from Supabase itself. */
export async function beginSupabaseMfaEnrollmentAction(): Promise<{
  factorId: string;
  qrSvg: string;
  secret: string;
}> {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) throw new Error(error?.message ?? 'Could not start MFA enrolment.');
  return { factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a Supabase TOTP factor (enrolment confirmation or a login challenge). */
export async function verifySupabaseMfaAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = mfaCodeSchema.safeParse({
    code: formData.get('code'),
    factorId: formData.get('factorId'),
  });
  if (!parsed.success || !parsed.data.factorId) {
    return {
      ok: false,
      message: firstIssueMessage(
        parsed.error ?? { issues: [{ message: 'Missing factor.' }] },
      ),
    };
  }
  const next = safeNextPath(formData.get('next'));

  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (error)
    return {
      ok: false,
      message: 'Incorrect code. Check your authenticator app and try again.',
    };

  redirect(toRoute(next));
}

/**
 * Password change for an already fully-authenticated user (settings/security
 * page), distinct from the forgot-password recovery flow. Demo mode
 * re-verifies the current password before accepting a new one; Supabase's
 * `updateUser` operates on the already-verified session.
 */
export async function changePasswordAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: 'Password updated.' };
  }

  const user = await requireUser();
  const verified = demoVerifyCredentials(user.email, parsed.data.currentPassword);
  if (!verified) return { ok: false, message: 'Your current password is incorrect.' };

  demoUpdatePassword(user.id, parsed.data.newPassword);
  return { ok: true, message: 'Password updated.' };
}

/**
 * Voluntary MFA self-enrolment from the settings page (demo mode), as
 * distinct from the mandatory admin enrolment gated at login. Operates on
 * the current fully-authenticated session — no pending cookie involved.
 */
export async function beginDemoSelfMfaEnrollmentAction(): Promise<{
  secret: string;
  qrSvg: string;
}> {
  const authUser = await requireUser();
  const user = findDemoUserById(authUser.id);
  if (!user) throw new Error('User not found.');

  const secret = user.pendingMfaSecret ?? generateTotpSecret();
  if (!user.pendingMfaSecret) demoBeginMfaEnrollment(user.id, secret);
  const qrSvg = await buildProvisioningQrSvg(secret, user.email);
  return { secret, qrSvg };
}

/** Confirms voluntary self-enrolment; does not touch the session cookie. */
export async function confirmDemoSelfMfaEnrollmentAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = mfaCodeSchema.safeParse({ code: formData.get('code') });
  if (!parsed.success) return { ok: false, message: firstIssueMessage(parsed.error) };

  const authUser = await requireUser();
  const user = findDemoUserById(authUser.id);
  if (!user) return { ok: false, message: 'User not found.' };

  if (
    !user.pendingMfaSecret ||
    !verifyTotpCode(user.pendingMfaSecret, parsed.data.code)
  ) {
    return {
      ok: false,
      message: 'Incorrect code. Check your authenticator app and try again.',
    };
  }

  demoConfirmMfaEnrollment(user.id);
  return { ok: true, message: 'Two-factor authentication enabled.' };
}
