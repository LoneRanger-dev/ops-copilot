import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

/**
 * Browser-only Supabase client factory.
 *
 * Split out of `src/lib/db/client.ts` because that module also imports
 * `next/headers` for the server-side constructions, and Next.js refuses to
 * bundle `next/headers` into any module reachable from a Client Component —
 * even if the Client Component only ever calls the browser export. Client
 * Components (e.g. `src/lib/auth/client.ts`) MUST import `createClient` from
 * here, not from `@/lib/db/client`.
 *
 * Reads `NEXT_PUBLIC_*` values directly from `process.env` rather than
 * `@/config/env`, which is server-only and must never be imported into a
 * Client Component (its module comment states this explicitly).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Azure AD SSO.',
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
