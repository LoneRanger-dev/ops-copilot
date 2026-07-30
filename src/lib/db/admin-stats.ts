import { isConfigured } from '@/config/env';
import { createAdminClient } from '@/lib/db/admin';

/**
 * Admin-only row-count aggregation (MASTER_BUILD_SPEC.md §23.4 frontend
 * task 1). This is a fourth, narrow, single-purpose permitted call site for
 * the service-role client — added alongside the three named in §16.6
 * because counting rows across every user's private data (conversations,
 * messages) is impossible under RLS from an ordinary session client, and an
 * admin-only table-count widget is exactly the kind of read the service role
 * exists for. See the ESLint override in `eslint.config.mjs`.
 */

const ROW_COUNT_TABLES = [
  'profiles',
  'conversations',
  'messages',
  'kb_documents',
  'kb_chunks',
  'snow_incident_cache',
  'ai_traces',
  'job_queue',
] as const;

export async function getTableRowCounts(): Promise<Record<string, number> | null> {
  if (!isConfigured.supabase) return null;

  const admin = createAdminClient();
  const entries = await Promise.all(
    ROW_COUNT_TABLES.map(async (table) => {
      const { count } = await admin
        .from(table)
        .select('*', { count: 'exact', head: true });
      return [table, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}
