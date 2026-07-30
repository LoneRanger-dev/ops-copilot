import type { ReactNode } from 'react';
import { requireUser } from '@/lib/auth/server';
import { AppShell } from '@/components/layout/app-shell';
import { AssistantProvider } from '@/components/providers/assistant-provider';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { FloatingAssistant } from '@/components/features/assistant/floating-assistant';

/**
 * The enterprise shell (MASTER_BUILD_SPEC.md §23.3 expected output).
 *
 * The floating assistant is mounted exactly once, here — never inside an
 * individual page — so its open/closed state (Zustand, `assistant.store.ts`)
 * survives client-side navigation between dashboard routes (FR-WIDGET-8).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <AssistantProvider>
      <AppShell role={user.role} email={user.email} fullName={user.fullName}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppShell>
      <FloatingAssistant />
    </AssistantProvider>
  );
}
