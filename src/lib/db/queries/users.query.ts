import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Profile queries against Supabase (MASTER_BUILD_SPEC.md §23.2).
 *
 * Every function takes an already-constructed client so callers control
 * which one (anon session-scoped vs. service-role) is used — this module
 * never constructs a client itself. Reached only when Supabase is
 * configured; the demo-mode equivalent is `src/lib/auth/demo-store.ts`.
 */

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export async function getProfileById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProfilesByOrg(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateProfile(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Database['public']['Tables']['profiles']['Update'],
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function touchLastSeen(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
