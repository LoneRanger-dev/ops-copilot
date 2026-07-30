'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { toRoute } from '@/lib/utils/routes';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'AI Chat',
  incidents: 'Incidents',
  knowledge: 'Knowledge Base',
  analytics: 'Analytics',
  settings: 'Settings',
  appearance: 'Appearance',
  security: 'Security',
  admin: 'Admin',
  users: 'Users',
  traces: 'AI Traces',
  audit: 'Audit Log',
  flags: 'Feature Flags',
};

function humanize(segment: string): string {
  return (
    LABELS[segment] ??
    segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

/** Derives breadcrumbs from the pathname (§23.3 acceptance criteria). */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  let hrefAccumulator = '';

  return (
    <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm sm:flex">
      {segments.map((segment, index) => {
        hrefAccumulator += `/${segment}`;
        const isLast = index === segments.length - 1;
        const href = hrefAccumulator;

        return (
          <Fragment key={href}>
            {index > 0 && (
              <ChevronRightIcon
                className="text-muted-foreground size-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span className="text-foreground font-medium" aria-current="page">
                {humanize(segment)}
              </span>
            ) : (
              <Link
                href={toRoute(href)}
                className="text-muted-foreground hover:text-foreground"
              >
                {humanize(segment)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
