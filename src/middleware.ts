import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

/**
 * Refreshes the session and protects every non-public route
 * (MASTER_BUILD_SPEC.md §23.2). The matcher excludes static assets and
 * Next.js internals — everything else goes through `updateSession`, which
 * decides whether to pass through, redirect, or refresh cookies.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
