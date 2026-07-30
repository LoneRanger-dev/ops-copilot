import type { ReactNode } from 'react';
import { CommandPalette } from './command-palette';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import type { UserRole } from '@/config/constants';

interface AppShellProps {
  role: UserRole;
  email: string;
  fullName: string | null;
  children: ReactNode;
}

/**
 * The application shell (MASTER_BUILD_SPEC.md §23.3 frontend task 3).
 *
 * A Server Component: it reads nothing itself and holds no state, only wires
 * the authenticated identity down into the client components that need it
 * (`Sidebar`, `Topbar`, `CommandPalette`). The floating assistant is mounted
 * by the `(dashboard)` layout, not here, so it stays outside this shell's
 * scroll container and remains fixed to the viewport.
 */
export function AppShell({ role, email, fullName, children }: AppShellProps) {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} email={email} fullName={fullName} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette role={role} />
    </div>
  );
}
