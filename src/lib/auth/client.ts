'use client';

import { createClient } from '@/lib/db/browser-client';

/**
 * Browser-side auth helpers.
 *
 * Everything else (password sign-in/up, sign-out, MFA, password reset) goes
 * through Server Actions in `src/lib/auth/actions.ts` so session cookies are
 * set server-side (httpOnly) rather than via client JavaScript. The one
 * exception is OAuth: `signInWithOAuth` must run in the browser because it
 * performs a full-page redirect to the identity provider.
 */
export async function signInWithAzureAd(next: string): Promise<void> {
  const supabase = createClient();
  const redirectTo = new URL('/callback', window.location.origin);
  if (next) redirectTo.searchParams.set('next', next);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: { redirectTo: redirectTo.toString() },
  });

  if (error) throw error;
}
