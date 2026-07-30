import { NextResponse, type NextRequest } from 'next/server';
import { isConfigured } from '@/config/env';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { safeNextPath } from '@/lib/auth/schemas';

/**
 * Supabase OAuth / recovery callback (MASTER_BUILD_SPEC.md §23.2).
 *
 * Exchanges the `code` query parameter for a session — used by both the
 * Azure AD SSO flow and the password-recovery email link. Demo mode has no
 * OAuth provider configured, so this route simply sends the browser back to
 * `/login` if reached without Supabase configured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (!isConfigured.supabase || !code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'Could not complete sign-in. Please try again.');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
