'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3Icon,
  BookOpenIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TicketIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { toRoute } from '@/lib/utils/routes';
import type { NavIcon } from '@/config/site';

const ICONS: Record<NavIcon, LucideIcon> = {
  LayoutDashboard: LayoutDashboardIcon,
  MessageSquare: MessageSquareIcon,
  Ticket: TicketIcon,
  BookOpen: BookOpenIcon,
  BarChart3: BarChart3Icon,
  Settings: SettingsIcon,
  ShieldCheck: ShieldCheckIcon,
};

interface SidebarNavItemProps {
  label: string;
  href: string;
  icon: NavIcon;
  /** Collapsed sidebars show only the icon, with the label in a tooltip via `title`. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** A single sidebar link with active-route highlighting (§23.3 acceptance criteria). */
export function SidebarNavItem({
  label,
  href,
  icon,
  collapsed,
  onNavigate,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const Icon = ICONS[icon];
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={toRoute(href)}
      {...(onNavigate ? { onClick: onNavigate } : {})}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        isActive && 'bg-accent text-accent-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
