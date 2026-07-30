'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { navigation, siteConfig } from '@/config/site';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import type { UserRole } from '@/config/constants';
import { useUiStore } from '@/stores/ui.store';
import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarProps {
  /** Role-derived, passed down from a Server Component per `<RoleGate>`'s own guidance. */
  role: UserRole;
  onNavigate?: () => void;
  /** Rendered without the collapse rail inside `MobileNav`'s sheet. */
  variant?: 'desktop' | 'mobile';
}

/**
 * Primary navigation (MASTER_BUILD_SPEC.md §23.3 frontend task 4).
 *
 * Filtering by role here is layer 1 (UI convenience) only — the API (layer 2)
 * and RLS (layer 3) are what actually stop an `end_user` from reaching admin
 * data even if they type the URL directly.
 */
export function Sidebar({ role, onNavigate, variant = 'desktop' }: SidebarProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const visibleItems = navigation.filter((item) => hasRoleAtLeast(role, item.minRole));
  const isCollapsed = variant === 'desktop' && collapsed;

  const content = (
    <nav
      aria-label="Primary"
      className="flex h-full flex-col gap-4 p-3"
      data-collapsed={isCollapsed}
    >
      {variant === 'desktop' && (
        <div
          className={cn('flex items-center px-1 py-2', isCollapsed && 'justify-center')}
        >
          {!isCollapsed && (
            <span className="text-foreground truncate text-sm font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            {...item}
            collapsed={isCollapsed}
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </div>

      {variant === 'desktop' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="size-4" />
          ) : (
            <>
              <ChevronLeftIcon className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      )}
    </nav>
  );

  if (variant === 'mobile') return content;

  return (
    <aside
      className={cn(
        'border-border bg-card hidden shrink-0 border-r transition-[width] duration-200 lg:block',
        isCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {content}
    </aside>
  );
}
