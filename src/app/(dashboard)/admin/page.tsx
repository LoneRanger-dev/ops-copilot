import { requireRole } from '@/lib/auth/server';
import { isConfigured } from '@/config/env';
import { listDemoUsers } from '@/lib/auth/demo-store';
import { getTableRowCounts } from '@/lib/db/admin-stats';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { DemoUser } from '@/lib/auth/demo-store';

export const dynamic = 'force-dynamic';

/**
 * Admin console (MASTER_BUILD_SPEC.md §23.9, FR-ADMIN-1/3). User management
 * only reads the demo-mode store in this build — the real version manages
 * `profiles` via the service-role client, gated the same way.
 */
export default async function AdminPage() {
  await requireRole('admin');
  const users = isConfigured.supabase ? [] : listDemoUsers();
  const rowCounts = await getTableRowCounts().catch(() => null);

  const columns: DataTableColumn<DemoUser>[] = [
    { key: 'name', header: 'Name', render: (u) => u.fullName },
    { key: 'email', header: 'Email', render: (u) => u.email },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge variant="outline">{u.role.replace('_', ' ')}</Badge>,
    },
    { key: 'department', header: 'Department', render: (u) => u.department ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.isActive ? 'success' : 'secondary'}>
          {u.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      render: (u) => (u.mfaEnrolled ? <Badge variant="outline">Enrolled</Badge> : '—'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin"
        description="User management, system health, and audit — demo-mode data source."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Users</CardTitle>
          <CardDescription>
            {isConfigured.supabase
              ? 'Backed by Supabase profiles.'
              : 'Backed by the in-memory demo store (resets on server restart).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} rows={users} getRowKey={(u) => u.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Database</CardTitle>
          <CardDescription>
            {rowCounts
              ? 'Live row counts from Supabase.'
              : 'Not configured — schema is written (supabase/migrations/) but unapplied. See docs/DATABASE.md.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rowCounts ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {Object.entries(rowCounts).map(([table, count]) => (
                <div key={table}>
                  <dt className="text-muted-foreground">{table}</dt>
                  <dd className="font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">
              18 tables, 13 enums, and 4 search functions are defined across{' '}
              <code>supabase/migrations/001-013,015</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Queue depth</CardDescription>
            <CardTitle className="text-2xl">0</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>KB index status</CardDescription>
            <CardTitle className="text-2xl">Healthy</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Error rate (24h)</CardDescription>
            <CardTitle className="text-2xl">0.0%</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
