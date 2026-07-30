import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { Tables, TablesInsert } from '@/lib/db/types';

export type AiTrace = Tables<'ai_traces'>;
export type AiTraceStep = Tables<'ai_trace_steps'>;

/** AI trace/step persistence (MASTER_BUILD_SPEC.md §23.4, FR-ANLY-3/4). */

export async function createTrace(
  supabase: SupabaseClient<Database>,
  trace: TablesInsert<'ai_traces'>,
): Promise<AiTrace> {
  const { data, error } = await supabase
    .from('ai_traces')
    .insert(trace)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function addTraceStep(
  supabase: SupabaseClient<Database>,
  step: TablesInsert<'ai_trace_steps'>,
): Promise<AiTraceStep> {
  const { data, error } = await supabase
    .from('ai_trace_steps')
    .insert(step)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function completeTrace(
  supabase: SupabaseClient<Database>,
  id: string,
  patch: Partial<
    Pick<
      AiTrace,
      | 'status'
      | 'groundedness'
      | 'risk_level'
      | 'step_count'
      | 'retrieval_count'
      | 'tool_call_count'
      | 'total_prompt_tokens'
      | 'total_completion_tokens'
      | 'total_cost_usd'
      | 'duration_ms'
      | 'error'
    >
  >,
): Promise<void> {
  const { error } = await supabase.from('ai_traces').update(patch).eq('id', id);
  if (error) throw error;
}

export async function listTracesByUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AiTrace[]> {
  const { data, error } = await supabase
    .from('ai_traces')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getTraceSteps(
  supabase: SupabaseClient<Database>,
  traceId: string,
): Promise<AiTraceStep[]> {
  const { data, error } = await supabase
    .from('ai_trace_steps')
    .select('*')
    .eq('trace_id', traceId)
    .order('step_index', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
