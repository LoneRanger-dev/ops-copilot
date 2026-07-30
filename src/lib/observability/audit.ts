import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import { insertAuditLog } from '@/lib/db/queries/audit.query';

/**
 * `writeAuditLog()` (MASTER_BUILD_SPEC.md §23.4 backend task 5, §16.9).
 * Takes a client parameter for the same reason `lib/jobs/queue.ts` does —
 * this module is not on the service-role ESLint allow-list, so callers with
 * an authenticated user's session client can still write their own audit
 * rows (the `audit_insert` RLS policy allows any authenticated insert scoped
 * to their org; only reading and the append-only guarantee are restricted).
 */
export interface AuditLogEntry {
  readonly orgId: string;
  readonly actorId: string | null;
  readonly actorEmail: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly before?: Json;
  readonly after?: Json;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly requestId?: string;
}

export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  entry: AuditLogEntry,
): Promise<void> {
  await insertAuditLog(supabase, {
    org_id: entry.orgId,
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    request_id: entry.requestId ?? null,
  });
}
