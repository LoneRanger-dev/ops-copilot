import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';

/**
 * Redirects by authentication state (MASTER_BUILD_SPEC.md §23.2). This route
 * never renders — Phase 3 builds the marketing/landing surface, if any; for
 * now every visitor is routed straight to the app.
 */
export default async function HomePage() {
  const user = await getSession();
  redirect(user ? '/dashboard' : '/login');
}
