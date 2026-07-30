import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Message } from '@/types/chat.types';
import type { TablesInsert } from '@/lib/db/types';

/** Message CRUD, scoped by conversation (MASTER_BUILD_SPEC.md §23.4). */

export async function listMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function insertMessage(
  supabase: SupabaseClient<Database>,
  message: TablesInsert<'messages'>,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
