import { USER_ROLES, type UserRole } from '@/config/constants';

/**
 * The permission matrix (MASTER_BUILD_SPEC.md §16.7). Every cell of this
 * table is asserted individually by
 * `src/__tests__/unit/auth/permissions.test.ts` — treat it as data, not code:
 * a change here changes what every role can do everywhere in the app.
 */
export const PERMISSIONS = [
  'chat:use',
  'widget:use',
  'conversation:own',
  'kb:read:public',
  'kb:read:internal',
  'kb:read:restricted',
  'kb:write',
  'incident:read:own',
  'incident:read:all',
  'incident:similar',
  'incident:escalate',
  'escalation:manage',
  'rca:run',
  'analytics:own',
  'analytics:team',
  'trace:read:own',
  'trace:read:all',
  'user:manage',
  'audit:read',
  'flags:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const EU = 'end_user' satisfies UserRole;
const SE = 'support_engineer' satisfies UserRole;
const MG = 'manager' satisfies UserRole;
const AD = 'admin' satisfies UserRole;

/** `true` if the row's permission is granted to the column's role. */
export const PERMISSION_MATRIX: Readonly<
  Record<Permission, Readonly<Record<UserRole, boolean>>>
> = {
  'chat:use': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'widget:use': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'conversation:own': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'kb:read:public': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'kb:read:internal': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'kb:read:restricted': { [EU]: false, [SE]: true, [MG]: true, [AD]: true },
  'kb:write': { [EU]: false, [SE]: false, [MG]: false, [AD]: true },
  'incident:read:own': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'incident:read:all': { [EU]: false, [SE]: true, [MG]: true, [AD]: true },
  'incident:similar': { [EU]: false, [SE]: true, [MG]: true, [AD]: true },
  'incident:escalate': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'escalation:manage': { [EU]: false, [SE]: true, [MG]: true, [AD]: true },
  'rca:run': { [EU]: false, [SE]: true, [MG]: true, [AD]: true },
  'analytics:own': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'analytics:team': { [EU]: false, [SE]: false, [MG]: true, [AD]: true },
  'trace:read:own': { [EU]: true, [SE]: true, [MG]: true, [AD]: true },
  'trace:read:all': { [EU]: false, [SE]: false, [MG]: false, [AD]: true },
  'user:manage': { [EU]: false, [SE]: false, [MG]: false, [AD]: true },
  'audit:read': { [EU]: false, [SE]: false, [MG]: false, [AD]: true },
  'flags:manage': { [EU]: false, [SE]: false, [MG]: false, [AD]: true },
} as const;

export { USER_ROLES };
export type { UserRole };
