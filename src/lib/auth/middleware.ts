import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env, isConfigured } from '@/config/env';
import type { Database } from '@/types/database.types';
import {
  MFA_PENDING_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyMfaPendingToken,
  verifySessionToken,
} from './demo-session';

/**
 * Session refresh + route protection (MASTER_BUILD_SPEC.md §23.2 backend
 * task 4), shared by `src/middleware.ts`. Split out so the routing rules are
 * unit-testable independent of the Next.js middleware runtime wiring.
 */

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/callback',
];
const PUBLIC_PREFIXES = ['/api/v1/health'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const authenticated = isConfigured.supabase
    ? await hasSupabaseSession(request, (res) => {
        response = res;
      })
    : await hasDemoSession(request, response);

  const isMfaPage = pathname === '/mfa';
  const isPublic = isPublicPath(pathname);

  if (!authenticated.user && !isPublic && !isMfaPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!authenticated.user && isMfaPage && !authenticated.mfaPending) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fully authenticated users mid-MFA-challenge may only reach `/mfa`.
  if (authenticated.mfaPending && !authenticated.user && !isMfaPage) {
    return NextResponse.redirect(new URL('/mfa', request.url));
  }

  // Fully authenticated users shouldn't see the auth pages again.
  if (authenticated.user && (isPublic || isMfaPage) && pathname !== '/callback') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

interface SessionCheckResult {
  user: boolean;
  mfaPending: boolean;
}

async function hasDemoSession(
  request: NextRequest,
  response: NextResponse,
): Promise<SessionCheckResult> {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const payload = await verifySessionToken(sessionToken);
    if (payload) {
      // Sliding expiry: re-issue the cookie on every request that carries a
      // valid one, so an active session never silently expires mid-use.
      response.cookies.set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return { user: true, mfaPending: false };
    }
  }

  const pendingToken = request.cookies.get(MFA_PENDING_COOKIE)?.value;
  if (pendingToken) {
    const pending = await verifyMfaPendingToken(pendingToken);
    if (pending) return { user: false, mfaPending: true };
  }

  return { user: false, mfaPending: false };
}

async function hasSupabaseSession(
  request: NextRequest,
  setResponse: (response: NextResponse) => void,
): Promise<SessionCheckResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  setResponse(response);

  if (!user) return { user: false, mfaPending: false };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaPending = Boolean(
    aal && aal.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel,
  );

  return { user: !mfaPending, mfaPending };
}
