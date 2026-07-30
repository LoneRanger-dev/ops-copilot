import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieMethodsServer } from '@supabase/ssr';
import { env, isConfigured } from '@/config/env';
import type { Database } from '@/types/database.types';

/**
 * Supabase server-side client construction (MASTER_BUILD_SPEC.md §23.2
 * backend task 2).
 *
 * Two distinct constructions here, deliberately not one shared factory —
 * conflating them causes subtle session bugs. The third construction
 * (browser, for Client Components) lives in `@/lib/db/browser-client`
 * instead: this module imports `next/headers`, which Next.js refuses to
 * bundle into anything reachable from a Client Component, even unused.
 *
 * 1. Server / Server Components (`createServerSupabaseClient`) — cookies are
 *    read-only here (`next/headers` `cookies()` cannot be mutated from a
 *    Server Component render). Writing is a silent no-op by design; session
 *    refresh happens in middleware instead.
 * 2. Route Handlers & Server Actions (`createRouteHandlerSupabaseClient`) —
 *    cookies ARE mutable here, so sign-in/sign-out can actually set/clear the
 *    session cookie.
 *
 * Both throw a clear error if called while Supabase is not configured —
 * callers MUST check `isConfigured.supabase` (or go through
 * `src/lib/auth/server.ts`, which does this for you) before constructing one.
 */

function assertSupabaseConfigured(): void {
  if (!isConfigured.supabase) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY, or use the demo-mode auth path in ' +
        'src/lib/auth/demo.ts via src/lib/auth/server.ts instead of calling ' +
        'this client directly.',
    );
  }
}

/** Server Component client. Cookie writes are intentionally dropped. */
export async function createServerSupabaseClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // No-op: a Server Component render cannot set cookies. Session
          // refresh is handled in middleware, which CAN write cookies.
        },
      } satisfies CookieMethodsServer,
    },
  );
}

/** Route Handler / Server Action client. Cookie writes take effect. */
export async function createRouteHandlerSupabaseClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      } satisfies CookieMethodsServer,
    },
  );
}
