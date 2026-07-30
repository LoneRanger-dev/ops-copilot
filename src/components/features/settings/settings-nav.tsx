'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/appearance', label: 'Appearance' },
  { href: '/settings/security', label: 'Security' },
] as const;

/** Sub-navigation shared by the three settings pages (§23.3). */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings" className="border-border flex gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium',
              isActive && 'border-primary text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
