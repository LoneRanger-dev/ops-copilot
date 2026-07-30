import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env, isConfigured } from '@/config/env';
import type { Database } from '@/types/database.types';

/**
 * Service-role Supabase client. BYPASSES ALL ROW-LEVEL SECURITY.
 *
 * Permitted call sites (enforced by `no-restricted-imports` in
 * eslint.config.mjs — do not import this module anywhere else):
 *   - `src/lib/jobs/handlers/*`
 *   - `src/app/api/v1/jobs/process/route.ts`
 *   - `src/lib/integrations/servicenow/sync.ts`
 *
 * Not used in Phase 2 — created now because the ESLint restriction that
 * governs it was installed ahead of time in Phase 1. It will be exercised
 * starting with the ingestion worker in Phase 5.
 */
export function createAdminClient() {
  if (
    !isConfigured.supabase ||
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'The Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY. Neither is required for local demo-mode ' +
        'development; this client is only reached by background jobs.',
    );
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
