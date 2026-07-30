/**
 * Client-safe site configuration.
 *
 * Deliberately does NOT import `src/config/env.ts` — that module is server-only.
 * Only `NEXT_PUBLIC_*` variables are read here, because Next.js inlines those
 * into the browser bundle. Everything else is a literal.
 *
 * The navigation tree is populated in Phase 3 when the application shell exists.
 */

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
