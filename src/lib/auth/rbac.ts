import { ForbiddenError } from '@/lib/api/errors';
import { PERMISSION_MATRIX, type Permission } from './permissions';
import type { UserRole } from '@/config/constants';

/** Layer 2 of the three-layer RBAC enforcement (MASTER_BUILD_SPEC.md §16.7). */
export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[permission][role];
}

/** Throws `ForbiddenError` (403) if `role` lacks `permission`. */
export function assertCan(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(permission);
  }
}

/**
 * Ordinal role rank, for "at least this role" checks. Layer 2 only —
 * Postgres RLS (layer 3) is the boundary that actually holds.
 */
const ROLE_RANK: Record<UserRole, number> = {
  end_user: 0,
  support_engineer: 1,
  manager: 2,
  admin: 3,
};

export function hasRoleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function assertRoleAtLeast(role: UserRole, minimum: UserRole): void {
  if (!hasRoleAtLeast(role, minimum)) {
    throw new ForbiddenError(`role >= ${minimum}`);
  }
}
