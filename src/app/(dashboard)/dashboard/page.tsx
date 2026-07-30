import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ActivityIcon,
  BarChart3Icon,
  BookOpenIcon,
  MessageSquareIcon,
  TicketIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { requireUser } from '@/lib/auth/server';
import { RoleGate } from '@/components/shared/role-gate';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { toRoute } from '@/lib/utils/routes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Dashboard' };

const KPIS = [
  { label: 'Open incidents', value: '—', hint: 'Live in Phase 8', icon: TicketIcon },
  { label: 'Deflection rate', value: '—', hint: 'Live in Phase 9', icon: TrendingUpIcon },
  { label: 'KB articles', value: '—', hint: 'Live in Phase 5', icon: BookOpenIcon },
  {
    label: 'Avg. response time',
    value: '—',
    hint: 'Live in Phase 9',
    icon: ActivityIcon,
  },
] as const;

const QUICK_ACTIONS = [
  { label: 'Ask the AI Chat', href: '/chat', icon: MessageSquareIcon },
  { label: 'Search incidents', href: '/incidents', icon: TicketIcon },
  { label: 'Browse knowledge base', href: '/knowledge', icon: BookOpenIcon },
  { label: 'View analytics', href: '/analytics', icon: BarChart3Icon },
] as const;

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome, ${user.fullName ?? user.email}`}
        description="Here's what's happening across your incidents, knowledge base, and AI usage."
      />

      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {KPIS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <kpi.icon className="text-muted-foreground size-4" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-foreground text-2xl font-semibold tracking-tight">
                {kpi.value}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-label="Quick actions">
        <h2 className="text-foreground mb-3 text-sm font-semibold">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.href}
              variant="outline"
              asChild
              className="h-auto justify-start gap-3 py-4"
            >
              <Link href={toRoute(action.href)}>
                <action.icon className="size-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <section aria-label="Recent activity">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Your latest conversations, tickets, and escalations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Once you start chatting with the AI assistant or viewing incidents, your recent activity will show up here."
              className="border-none py-10"
            />
          </CardContent>
        </Card>
      </section>

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
