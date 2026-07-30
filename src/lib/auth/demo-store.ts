import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { UserRole } from '@/config/constants';

/**
 * Demo-mode user store (hackathon portability override —
 * docs/IMPLEMENTATION_OVERRIDE.md).
 *
 * Active only when Supabase is not configured (`isConfigured.supabase ===
 * false`), which is the state of a fresh clone with only `OPENAI_API_KEY`
 * set. Backs the same `src/lib/auth/server.ts` interface that the Supabase
 * path implements, so route handlers, pages, and `<RoleGate>` never know
 * which backend is active.
 *
 * Storage is an in-memory `Map`, scoped to the Node process. It resets on
 * every `next dev` restart — acceptable for a demo whose four personas are
 * reseeded deterministically on boot, but NOT a substitute for the real
 * Supabase/Postgres path once a project is configured.
 */

export interface DemoUser {
  id: string;
  orgId: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  isActive: boolean;
  mfaEnrolled: boolean;
  mfaSecret: string | null;
  pendingMfaSecret: string | null;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function makeUser(
  email: string,
  fullName: string,
  role: UserRole,
  department: string,
  password: string,
): DemoUser {
  const { salt, hash } = hashPassword(password);
  return {
    id: randomUUID(),
    orgId: DEFAULT_ORG_ID,
    email: email.toLowerCase(),
    fullName,
    role,
    department,
    isActive: true,
    mfaEnrolled: false,
    mfaSecret: null,
    pendingMfaSecret: null,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
  };
}

/** The four personas from MASTER_BUILD_SPEC.md §2.3, one demo password each. */
export const DEMO_PERSONA_PASSWORD = 'OpsCopilot#2026';

// A module-level singleton survives Next.js dev's Fast Refresh (which only
// reloads changed modules) via `globalThis`, so signing up in one request and
// signing in on the next does not lose data because of an HMR remount.
const globalForDemoStore = globalThis as unknown as {
  __opsCopilotDemoStore?: Map<string, DemoUser>;
};

const users: Map<string, DemoUser> =
  globalForDemoStore.__opsCopilotDemoStore ??
  (globalForDemoStore.__opsCopilotDemoStore = new Map<string, DemoUser>([
    [
      'priya@opscopilot.demo',
      makeUser(
        'priya@opscopilot.demo',
        'Priya Sharma',
        'end_user',
        'Finance',
        DEMO_PERSONA_PASSWORD,
      ),
    ],
    [
      'marcus@opscopilot.demo',
      makeUser(
        'marcus@opscopilot.demo',
        'Marcus Chen',
        'support_engineer',
        'IT Support',
        DEMO_PERSONA_PASSWORD,
      ),
    ],
    [
      'dana@opscopilot.demo',
      makeUser(
        'dana@opscopilot.demo',
        'Dana Whitfield',
        'manager',
        'IT Support',
        DEMO_PERSONA_PASSWORD,
      ),
    ],
    [
      'sam@opscopilot.demo',
      makeUser(
        'sam@opscopilot.demo',
        'Sam Okafor',
        'admin',
        'Platform Engineering',
        DEMO_PERSONA_PASSWORD,
      ),
    ],
  ]));

const resetTokens: Map<string, { email: string; expiresAt: number }> =
  (globalForDemoStore as unknown as { __opsCopilotResetTokens?: typeof resetTokens })
    .__opsCopilotResetTokens ??
  ((
    globalForDemoStore as unknown as { __opsCopilotResetTokens?: typeof resetTokens }
  ).__opsCopilotResetTokens = new Map());

export function findDemoUserByEmail(email: string): DemoUser | undefined {
  return users.get(email.toLowerCase());
}

export function findDemoUserById(id: string): DemoUser | undefined {
  for (const user of users.values()) if (user.id === id) return user;
  return undefined;
}

export function listDemoUsers(): DemoUser[] {
  return Array.from(users.values());
}

export interface DemoSignUpResult {
  ok: true;
  user: DemoUser;
}
export interface DemoSignUpError {
  ok: false;
  reason: 'email_taken';
}

export function demoSignUp(
  email: string,
  password: string,
  fullName: string,
): DemoSignUpResult | DemoSignUpError {
  const normalised = email.toLowerCase();
  if (users.has(normalised)) return { ok: false, reason: 'email_taken' };

  const user = makeUser(normalised, fullName, 'end_user', 'Unassigned', password);
  users.set(normalised, user);
  return { ok: true, user };
}

/** Never distinguishes "no such user" from "wrong password" to the caller. */
export function demoVerifyCredentials(email: string, password: string): DemoUser | null {
  const user = findDemoUserByEmail(email);
  if (!user || !user.isActive) return null;
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) return null;
  return user;
}

export function demoUpdatePassword(userId: string, newPassword: string): boolean {
  const user = findDemoUserById(userId);
  if (!user) return false;
  const { salt, hash } = hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  return true;
}

export function demoBeginMfaEnrollment(userId: string, secret: string): boolean {
  const user = findDemoUserById(userId);
  if (!user) return false;
  user.pendingMfaSecret = secret;
  return true;
}

export function demoConfirmMfaEnrollment(userId: string): boolean {
  const user = findDemoUserById(userId);
  if (!user || !user.pendingMfaSecret) return false;
  user.mfaSecret = user.pendingMfaSecret;
  user.pendingMfaSecret = null;
  user.mfaEnrolled = true;
  return true;
}

export function demoCreatePasswordResetToken(email: string): string | null {
  const user = findDemoUserByEmail(email);
  if (!user) return null;
  const token = randomBytes(24).toString('hex');
  resetTokens.set(token, { email: user.email, expiresAt: Date.now() + 30 * 60 * 1000 });
  return token;
}

export function demoConsumePasswordResetToken(token: string): DemoUser | null {
  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  resetTokens.delete(token);
  return findDemoUserByEmail(entry.email) ?? null;
}
