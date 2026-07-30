import { requireRole } from '@/lib/auth/server';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { MiniBarChart, Sparkline } from '@/components/features/analytics/mini-charts';

export const dynamic = 'force-dynamic';

/**
 * Analytics dashboard (MASTER_BUILD_SPEC.md §23.9, FR-ANLY-1/2). Mock KPI
 * data — the real version aggregates `ai_traces`/`messages`/`feedback` from
 * Postgres, none of which exist in this demo-mode deployment. Managers and
 * admins see this; `requireRole('manager')` is layer 2, RLS would be layer 3
 * once the real tables exist.
 */
export default async function AnalyticsPage() {
  await requireRole('manager');

  const weeklyVolume = [
    { label: 'Mon', value: 42 },
    { label: 'Tue', value: 58 },
    { label: 'Wed', value: 51 },
    { label: 'Thu', value: 67 },
    { label: 'Fri', value: 73 },
    { label: 'Sat', value: 21 },
    { label: 'Sun', value: 18 },
  ];
  const latencyTrend = [1420, 1310, 1380, 1190, 1240, 1080, 1150];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Volume, deflection, quality, and cost — team-level view for managers and admins."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Sessions this week</CardDescription>
            <CardTitle className="text-2xl">330</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Deflection rate</CardDescription>
            <CardTitle className="text-2xl">34%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Thumbs-up rate</CardDescription>
            <CardTitle className="text-2xl">81%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Median cost / session</CardDescription>
            <CardTitle className="text-2xl">$0.04</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sessions by day</CardTitle>
            <CardDescription>Main chat + floating widget combined</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={weeklyVolume} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">p95 first-token latency (ms)</CardTitle>
            <CardDescription>Target ≤ 1500ms, main chat</CardDescription>
          </CardHeader>
          <CardContent>
            <Sparkline points={latencyTrend} className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
