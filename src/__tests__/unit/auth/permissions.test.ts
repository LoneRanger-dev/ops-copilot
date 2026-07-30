import { describe, expect, it } from 'vitest';
import { PERMISSIONS, PERMISSION_MATRIX } from '@/lib/auth/permissions';
import { USER_ROLES, type UserRole } from '@/config/constants';

/**
 * Asserts every cell of the 4 × 20 role/permission matrix
 * (MASTER_BUILD_SPEC.md §16.7, §23.2 testing task 1).
 */
describe('permission matrix', () => {
  it('defines a value for every role on every permission', () => {
    for (const permission of PERMISSIONS) {
      for (const role of USER_ROLES) {
        expect(typeof PERMISSION_MATRIX[permission][role]).toBe('boolean');
      }
    }
  });

  const expected: Record<string, Record<string, boolean>> = {
    'chat:use': { end_user: true, support_engineer: true, manager: true, admin: true },
    'widget:use': { end_user: true, support_engineer: true, manager: true, admin: true },
    'conversation:own': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'kb:read:public': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'kb:read:internal': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'kb:read:restricted': {
      end_user: false,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'kb:write': { end_user: false, support_engineer: false, manager: false, admin: true },
    'incident:read:own': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'incident:read:all': {
      end_user: false,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'incident:similar': {
      end_user: false,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'incident:escalate': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'escalation:manage': {
      end_user: false,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'rca:run': { end_user: false, support_engineer: true, manager: true, admin: true },
    'analytics:own': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'analytics:team': {
      end_user: false,
      support_engineer: false,
      manager: true,
      admin: true,
    },
    'trace:read:own': {
      end_user: true,
      support_engineer: true,
      manager: true,
      admin: true,
    },
    'trace:read:all': {
      end_user: false,
      support_engineer: false,
      manager: false,
      admin: true,
    },
    'user:manage': {
      end_user: false,
      support_engineer: false,
      manager: false,
      admin: true,
    },
    'audit:read': {
      end_user: false,
      support_engineer: false,
      manager: false,
      admin: true,
    },
    'flags:manage': {
      end_user: false,
      support_engineer: false,
      manager: false,
      admin: true,
    },
  };

  it('matches the specification matrix exactly, cell by cell', () => {
    for (const [permission, roles] of Object.entries(expected)) {
      for (const [role, allowed] of Object.entries(roles)) {
        expect(
          PERMISSION_MATRIX[permission as keyof typeof PERMISSION_MATRIX][
            role as UserRole
          ],
          `${permission} / ${role}`,
        ).toBe(allowed);
      }
    }
  });

  it('covers all twenty permissions named in §16.7', () => {
    expect(PERMISSIONS).toHaveLength(20);
    expect(Object.keys(expected)).toHaveLength(20);
  });
});
