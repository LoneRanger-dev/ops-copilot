import type { ReactNode } from 'react';
import { getSession } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import type { UserRole } from '@/config/constants';

interface RoleGateProps {
  /** Minimum role required to render `children` (§16.7 layer 1 — UI convenience only). */
  role: UserRole;
  children: ReactNode;
  /** Rendered instead of nothing when the check fails. Optional. */
  fallback?: ReactNode;
}

/**
 * Conditionally renders by role (MASTER_BUILD_SPEC.md §23.2 frontend task 8).
 *
 * This is layer 1 of three. It is trivially bypassed by calling the API
 * directly, which is exactly why layers 2 (API) and 3 (RLS) exist and are
 * independently sufficient. Never use `<RoleGate>` as the only protection for
 * sensitive data or actions.
 *
 * Server Component only — reads the session directly. Pass role-derived
 * booleans as props into Client Components rather than using this there.
 */
export async function RoleGate({ role, children, fallback = null }: RoleGateProps) {
  const user = await getSession();
  if (!user || !hasRoleAtLeast(user.role, role)) return <>{fallback}</>;
  return <>{children}</>;
}
