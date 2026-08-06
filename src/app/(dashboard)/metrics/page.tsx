import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { RoleGate } from '@/components/shared/role-gate';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Metrics' };

async function fetchMetrics() {
  const res = await fetch('/api/v1/metrics', { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function MetricsPage() {
  await requireUser();
  const data = await fetchMetrics();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Metrics`} description={`Live in-memory counters (admin)`} />

      <RoleGate role="admin">
        <Card>
          <CardHeader>
            <CardTitle>In-memory metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(data ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </RoleGate>
    </div>
  );
}
