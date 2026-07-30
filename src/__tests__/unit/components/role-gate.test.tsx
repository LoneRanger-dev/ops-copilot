import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from '@/components/shared/role-gate';
import { getSession } from '@/lib/auth/server';

vi.mock('@/lib/auth/server', () => ({
  getSession: vi.fn(),
}));

const mockGetSession = vi.mocked(getSession);

describe('RoleGate', () => {
  it('renders children when the session role meets the minimum', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u1',
      email: 'sam@opscopilot.demo',
      fullName: 'Sam Okafor',
      role: 'admin',
      orgId: 'org1',
      department: null,
      mfaEnrolled: true,
      preferences: { theme: 'system', density: 'comfortable' },
    });

    render(await RoleGate({ role: 'admin', children: <p>Admin only</p> }));
    expect(screen.getByText('Admin only')).toBeInTheDocument();
  });

  it('renders nothing when the role is below the minimum', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u2',
      email: 'priya@opscopilot.demo',
      fullName: 'Priya Sharma',
      role: 'end_user',
      orgId: 'org1',
      department: null,
      mfaEnrolled: false,
      preferences: { theme: 'system', density: 'comfortable' },
    });

    render(await RoleGate({ role: 'admin', children: <p>Admin only</p> }));
    expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
  });

  it('renders the fallback when there is no session', async () => {
    mockGetSession.mockResolvedValue(null);

    render(
      await RoleGate({
        role: 'admin',
        children: <p>Admin only</p>,
        fallback: <p>Not authorised</p>,
      }),
    );
    expect(screen.getByText('Not authorised')).toBeInTheDocument();
  });
});
