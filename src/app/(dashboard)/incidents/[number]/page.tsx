import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { getIncidentByNumber } from '@/lib/integrations/servicenow/mock-data';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toRoute } from '@/lib/utils/routes';

export const dynamic = 'force-dynamic';

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const user = await requireUser();
  const incident = getIncidentByNumber(number);

  if (!incident) notFound();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');
  if (!isStaff && incident.callerEmail !== user.email) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={toRoute('/incidents')}>
            <ArrowLeftIcon className="size-4" /> Back to incidents
          </Link>
        </Button>
        <PageHeader
          title={incident.number}
          description={incident.shortDescription}
          actions={
            <>
              <Badge variant="outline">P{incident.priority}</Badge>
              <Badge variant="secondary">{incident.state.replace('_', ' ')}</Badge>
            </>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {incident.description}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assignment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd>{incident.assignedTo}</dd>
              <dt className="text-muted-foreground">Group</dt>
              <dd>{incident.assignmentGroup}</dd>
              <dt className="text-muted-foreground">Reported by</dt>
              <dd>{incident.callerEmail}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted-foreground">Opened</dt>
              <dd>{new Date(incident.openedAt).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{new Date(incident.updatedAt).toLocaleString()}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Work notes</CardTitle>
        </CardHeader>
        <CardContent>
          {incident.workNotes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No work notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {incident.workNotes.map((note, i) => (
                <li key={i} className="border-border border-l-2 pl-3">
                  {note}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
