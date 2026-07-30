import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { RoleGate } from '@/components/shared/role-gate';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Welcome, {user.fullName ?? user.email}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Phase 2 · Authentication is live. The full enterprise shell arrives in Phase 3.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your session</CardTitle>
          <CardDescription>
            Read directly from the authenticated session — proof the route is protected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground font-medium">{user.email}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground font-medium">{user.role}</dd>
            <dt className="text-muted-foreground">Organization</dt>
            <dd className="text-foreground font-medium">{user.orgId}</dd>
            <dt className="text-muted-foreground">MFA enrolled</dt>
            <dd className="text-foreground font-medium">
              {user.mfaEnrolled ? 'Yes' : 'No'}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <RoleGate role="admin">
        <Card>
          <CardHeader>
            <CardTitle>Administrator panel</CardTitle>
            <CardDescription>
              Only rendered for the `admin` role — proof `&lt;RoleGate&gt;` works.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              User management, KB curation, and audit logs arrive in later phases.
            </p>
          </CardContent>
        </Card>
      </RoleGate>
    </div>
  );
}
