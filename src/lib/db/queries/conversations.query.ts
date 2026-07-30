import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Conversation } from '@/types/chat.types';

/** Conversation CRUD (MASTER_BUILD_SPEC.md §23.4). No raw client leaves `lib/db/`. */

export async function listConversations(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createConversation(
  supabase: SupabaseClient<Database>,
  params: {
    orgId: string;
    userId: string;
    surface: Conversation['surface'];
    title?: string;
  },
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      org_id: params.orgId,
      user_id: params.userId,
      surface: params.surface,
      ...(params.title ? { title: params.title } : {}),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function renameConversation(
  supabase: SupabaseClient<Database>,
  id: string,
  title: string,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function archiveConversation(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteConversation(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function touchConversation(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: { messageCountDelta: number; tokensDelta: number; costDelta: number },
): Promise<void> {
  const current = await getConversation(supabase, id);
  if (!current) return;

  const { error } = await supabase
    .from('conversations')
    .update({
      message_count: current.message_count + patch.messageCountDelta,
      total_tokens: current.total_tokens + patch.tokensDelta,
      total_cost_usd: current.total_cost_usd + patch.costDelta,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
