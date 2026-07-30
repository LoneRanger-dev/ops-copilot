import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { searchIncidents } from '@/lib/integrations/servicenow/mock-data';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { toRoute } from '@/lib/utils/routes';
import type { MockIncident } from '@/lib/integrations/servicenow/mock-data';

export const dynamic = 'force-dynamic';

const PRIORITY_VARIANT = {
  1: 'destructive',
  2: 'warning',
  3: 'secondary',
  4: 'outline',
  5: 'outline',
} as const;

const STATE_LABEL: Record<MockIncident['state'], string> = {
  new: 'New',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

/**
 * Incidents (MASTER_BUILD_SPEC.md §23.8, FR-SNOW-7/8). End users see only
 * their own tickets; support engineers and above see all — enforced here at
 * the query layer against the mock ServiceNow dataset, mirroring the RLS
 * scoping a real integration would apply in Postgres.
 */
export default async function IncidentsPage() {
  const user = await requireUser();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');

  const incidents = searchIncidents(isStaff ? {} : { callerEmail: user.email });

  const columns: DataTableColumn<MockIncident>[] = [
    {
      key: 'number',
      header: 'Number',
      render: (row) => (
        <Link
          href={toRoute(`/incidents/${row.number}`)}
          className="text-primary font-mono text-xs font-medium hover:underline"
        >
          {row.number}
        </Link>
      ),
    },
    {
      key: 'short_description',
      header: 'Description',
      render: (row) => row.shortDescription,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <Badge variant={PRIORITY_VARIANT[row.priority]}>P{row.priority}</Badge>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (row) => <Badge variant="outline">{STATE_LABEL[row.state]}</Badge>,
    },
    { key: 'assigned_to', header: 'Assigned to', render: (row) => row.assignedTo },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Incidents"
        description={
          isStaff
            ? 'All incidents from the mock ServiceNow cache, refreshed every 5 minutes in production.'
            : 'Incidents you raised. Support engineers and above can see the full queue.'
        }
      />
      <DataTable
        columns={columns}
        rows={incidents}
        getRowKey={(row) => row.number}
        emptyTitle="No incidents found"
        emptyDescription="Nothing matches this view yet."
      />
    </div>
  );
}
