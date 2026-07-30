import { cookies } from 'next/headers';
import { isConfigured } from '@/config/env';
import {
  parsePreferences,
  type UserPreferences,
  type UserRole,
} from '@/config/constants';
import { UnauthenticatedError } from '@/lib/api/errors';
import { createServerSupabaseClient } from '@/lib/db/client';
import { getProfileById } from '@/lib/db/queries/users.query';
import { assertRoleAtLeast } from './rbac';
import { findDemoUserById } from './demo-store';
import {
  MFA_PENDING_COOKIE,
  SESSION_COOKIE,
  verifyMfaPendingToken,
  verifySessionToken,
} from './demo-session';

/**
 * Unified session accessor (MASTER_BUILD_SPEC.md §23.2 backend task 5).
 *
 * Branches on `isConfigured.supabase` so every caller — pages, Server
 * Actions, `<RoleGate>`, route handlers — reads a session the same way
 * regardless of which auth backend is active. This is the ONLY place that
 * branch happens; nothing downstream needs to know.
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly role: UserRole;
  readonly orgId: string;
  readonly department: string | null;
  readonly mfaEnrolled: boolean;
  readonly preferences: UserPreferences;
}

export async function getSession(): Promise<AuthUser | null> {
  if (isConfigured.supabase) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getProfileById(supabase, user.id);
    if (!profile || !profile.is_active) return null;

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      orgId: profile.org_id,
      department: profile.department,
      mfaEnrolled: profile.mfa_enrolled,
      preferences: parsePreferences(profile.preferences),
    };
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = findDemoUserById(payload.sub);
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    orgId: user.orgId,
    department: user.department,
    mfaEnrolled: user.mfaEnrolled,
    preferences: user.preferences,
  };
}

/** Demo mode only: the user ID mid-MFA-challenge, if any (see `demo-session.ts`). */
export async function getPendingMfaUserId(): Promise<string | null> {
  if (isConfigured.supabase) return null;
  const store = await cookies();
  const token = store.get(MFA_PENDING_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyMfaPendingToken(token);
  return payload?.sub ?? null;
}

/** Throws `UnauthenticatedError` (401) rather than returning `null`. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getSession();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/** `requireUser()` plus an "at least this role" check (§16.7 layer 2). */
export async function requireRole(minimum: UserRole): Promise<AuthUser> {
  const user = await requireUser();
  assertRoleAtLeast(user.role, minimum);
  return user;
}
