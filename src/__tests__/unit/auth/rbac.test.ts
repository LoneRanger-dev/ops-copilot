import { describe, expect, it } from 'vitest';
import { can, assertCan, hasRoleAtLeast, assertRoleAtLeast } from '@/lib/auth/rbac';
import { ForbiddenError } from '@/lib/api/errors';

describe('can()', () => {
  it('returns true when the permission matrix grants the permission', () => {
    expect(can('admin', 'user:manage')).toBe(true);
    expect(can('support_engineer', 'incident:read:all')).toBe(true);
  });

  it('returns false when the permission matrix denies the permission', () => {
    expect(can('end_user', 'user:manage')).toBe(false);
    expect(can('manager', 'kb:write')).toBe(false);
  });
});

describe('assertCan()', () => {
  it('does not throw when the role has the permission', () => {
    expect(() => assertCan('admin', 'audit:read')).not.toThrow();
  });

  it('throws ForbiddenError with the FORBIDDEN code when denied', () => {
    try {
      assertCan('end_user', 'audit:read');
      expect.unreachable('assertCan should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).code).toBe('FORBIDDEN');
      expect((error as ForbiddenError).httpStatus).toBe(403);
    }
  });
});

describe('hasRoleAtLeast()', () => {
  it('orders roles end_user < support_engineer < manager < admin', () => {
    expect(hasRoleAtLeast('end_user', 'end_user')).toBe(true);
    expect(hasRoleAtLeast('end_user', 'support_engineer')).toBe(false);
    expect(hasRoleAtLeast('support_engineer', 'end_user')).toBe(true);
    expect(hasRoleAtLeast('manager', 'support_engineer')).toBe(true);
    expect(hasRoleAtLeast('admin', 'manager')).toBe(true);
    expect(hasRoleAtLeast('manager', 'admin')).toBe(false);
  });
});

describe('assertRoleAtLeast()', () => {
  it('throws ForbiddenError when below the minimum', () => {
    expect(() => assertRoleAtLeast('end_user', 'admin')).toThrow(ForbiddenError);
  });

  it('does not throw when at or above the minimum', () => {
    expect(() => assertRoleAtLeast('admin', 'admin')).not.toThrow();
  });
});
