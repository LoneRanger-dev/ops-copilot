import type { ReactNode } from 'react';
import Link from 'next/link';
import { toRoute } from '@/lib/utils/routes';

const ADMIN_NAV = [
  { label: 'Overview', href: '/admin' },
  { label: 'Knowledge Base', href: '/admin/knowledge' },
] as const;

/** Admin section shell — sub-navigation shared by every `/admin/*` page. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Admin sections" className="border-border flex gap-4 border-b">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={toRoute(item.href)}
            className="text-muted-foreground hover:text-foreground border-b-2 border-transparent py-2 text-sm font-medium transition-colors hover:border-current"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
