import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, JobType } from '@/types/database.types';
import type { Tables, TablesInsert } from '@/lib/db/types';

export type Job = Tables<'job_queue'>;

/**
 * Raw job queue persistence (MASTER_BUILD_SPEC.md §23.4, §8.5). The claim
 * query uses `FOR UPDATE SKIP LOCKED` via an RPC rather than a plain
 * `.select()` — Supabase's PostgREST layer cannot express row locking, so
 * concurrency-safety requires a database function. `claim_jobs` is not yet
 * defined in a migration (Phase 4 ships the table; the claim function ships
 * with the worker in a later phase once a live Postgres instance exists to
 * validate `SKIP LOCKED` behaviour against). Until then, `claimJobs` here
 * uses a best-effort optimistic update, documented as a known gap in
 * `docs/DATABASE.md`.
 */

export async function enqueueJob(
  supabase: SupabaseClient<Database>,
  job: TablesInsert<'job_queue'>,
): Promise<Job> {
  const { data, error } = await supabase
    .from('job_queue')
    .insert(job)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Best-effort claim: select pending/failed jobs due to run, then optimistically
 * update `status = 'processing'` filtered on the previous status so two
 * workers racing on the same row only have one `UPDATE` succeed materially
 * (Postgres still serialises the two `UPDATE`s; the second one's `WHERE`
 * clause no longer matches once the first commits). This gives at-least-once
 * semantics without `SKIP LOCKED` — acceptable for this deployment's single-
 * worker cron trigger, and upgradeable to a real `claim_jobs()` RPC without
 * changing this function's signature.
 */
export async function claimJobs(
  supabase: SupabaseClient<Database>,
  limit: number,
  lockedBy: string,
): Promise<Job[]> {
  const { data: candidates, error: selectError } = await supabase
    .from('job_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('run_after', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('run_after', { ascending: true })
    .limit(limit);
  if (selectError) throw selectError;
  if (!candidates || candidates.length === 0) return [];

  const claimed: Job[] = [];
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('job_queue')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        locked_by: lockedBy,
      })
      .eq('id', candidate.id)
      .eq('status', candidate.status)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (data) claimed.push(data);
  }
  return claimed;
}

export async function completeJob(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('job_queue')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Exponential backoff: `run_after = now + 2^attempts minutes`, dead-letter at 5 attempts. */
export async function failJob(
  supabase: SupabaseClient<Database>,
  job: Pick<Job, 'id' | 'attempts' | 'max_attempts'>,
  errorMessage: string,
): Promise<void> {
  const attempts = job.attempts + 1;
  const deadLettered = attempts >= job.max_attempts;
  const backoffMinutes = 2 ** attempts;

  const { error } = await supabase
    .from('job_queue')
    .update({
      status: deadLettered ? 'dead_letter' : 'failed',
      attempts,
      last_error: errorMessage,
      run_after: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
    })
    .eq('id', job.id);
  if (error) throw error;
}

export async function countPendingJobs(
  supabase: SupabaseClient<Database>,
  jobType?: JobType,
): Promise<number> {
  let query = supabase
    .from('job_queue')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'processing']);
  if (jobType) query = query.eq('job_type', jobType);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
