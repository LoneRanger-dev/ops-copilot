import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Tables, TablesInsert } from '@/lib/db/types';

export type AuditLog = Tables<'audit_logs'>;

/**
 * Audit log query module (MASTER_BUILD_SPEC.md §23.4/§16.9). `audit_logs`
 * has no UPDATE or DELETE policy for any role — this module exposes only
 * `insert` and `list`, matching what the database actually allows.
 */

export async function insertAuditLog(
  supabase: SupabaseClient<Database>,
  entry: TablesInsert<'audit_logs'>,
): Promise<AuditLog> {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert(entry)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listAuditLogs(
  supabase: SupabaseClient<Database>,
  orgId: string,
  filters?: { action?: string; actorId?: string },
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.actorId) query = query.eq('actor_id', filters.actorId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
