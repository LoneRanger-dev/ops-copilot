import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Tables, TablesInsert } from '@/lib/db/types';

export type Feedback = Tables<'feedback'>;

/** Per-message feedback, one vote per user per message (MASTER_BUILD_SPEC.md §23.9). */

export async function upsertFeedback(
  supabase: SupabaseClient<Database>,
  feedback: TablesInsert<'feedback'>,
): Promise<Feedback> {
  const { data, error } = await supabase
    .from('feedback')
    .upsert(feedback, { onConflict: 'message_id,user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listFeedbackByOrg(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
