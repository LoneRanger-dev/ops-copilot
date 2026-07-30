import type { ReactNode } from 'react';
import { siteConfig } from '@/config/site';

/**
 * The `(auth)` layout (MASTER_BUILD_SPEC.md §23.2 frontend task 2).
 *
 * Deliberately minimal: no sidebar, no top bar, no floating assistant. A
 * centred card is the entire surface — someone signing in has no use for
 * the application shell yet.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-foreground text-lg font-semibold tracking-tight">
            {siteConfig.name}
          </span>
          <p className="text-muted-foreground mt-1 text-sm">{siteConfig.tagline}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
