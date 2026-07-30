/**
 * Client-safe site configuration.
 *
 * Deliberately does NOT import `src/config/env.ts` — that module is server-only.
 * Only `NEXT_PUBLIC_*` variables are read here, because Next.js inlines those
 * into the browser bundle. Everything else is a literal.
 */

import type { UserRole } from '@/config/constants';

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'OpsCopilot',
  tagline: 'Your AI Support Engineer',
  description:
    'Enterprise AI-powered IT application maintenance assistant. Understands ' +
    'natural language, retrieves incidents, searches enterprise knowledge, and ' +
    'grounds every answer in cited evidence.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ssoEnabled: process.env.NEXT_PUBLIC_SSO_ENABLED === 'true',
} as const;

export type SiteConfig = typeof siteConfig;

/** Icon key resolved to a `lucide-react` component in `sidebar.tsx`. */
export type NavIcon =
  | 'LayoutDashboard'
  | 'MessageSquare'
  | 'Ticket'
  | 'BookOpen'
  | 'BarChart3'
  | 'Settings'
  | 'ShieldCheck';

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: NavIcon;
  /** The sidebar hides this item for any role below this rank (§16.7 layer 1). */
  readonly minRole: UserRole;
}

/**
 * Primary navigation tree (MASTER_BUILD_SPEC.md §23.3 backend task 1).
 *
 * Routes not yet built by an earlier phase (`/chat`, `/incidents`,
 * `/knowledge`, `/analytics`, `/admin`) intentionally link to their final
 * Phase 5/7/8/9 destination now — Next.js's `not-found.tsx` renders until
 * those phases land, rather than the sidebar omitting links it will need
 * later.
 */
export const navigation: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    minRole: 'end_user',
  },
  { label: 'AI Chat', href: '/chat', icon: 'MessageSquare', minRole: 'end_user' },
  { label: 'Incidents', href: '/incidents', icon: 'Ticket', minRole: 'end_user' },
  { label: 'Knowledge Base', href: '/knowledge', icon: 'BookOpen', minRole: 'end_user' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3', minRole: 'end_user' },
  { label: 'Settings', href: '/settings', icon: 'Settings', minRole: 'end_user' },
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck', minRole: 'admin' },
] as const;
