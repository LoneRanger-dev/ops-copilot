import type { ReactNode } from 'react';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/server';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';

/**
 * Minimal protected shell (MASTER_BUILD_SPEC.md §23.2 expected output).
 *
 * Deliberately a placeholder — the full enterprise shell (persistent sidebar,
 * command palette, floating assistant) is Phase 3. This exists only to prove
 * the route is protected and to display the authenticated identity.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-border bg-card/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="text-foreground text-sm font-semibold tracking-tight">
            {siteConfig.name}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">
              {user.email} ·{' '}
              <span className="text-foreground font-medium">{user.role}</span>
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
