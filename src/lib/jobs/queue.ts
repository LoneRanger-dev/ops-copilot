import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, JobType, Json } from '@/types/database.types';
import { enqueueJob, claimJobs, completeJob, failJob } from '@/lib/db/queries/jobs.query';
import type { Job } from '@/lib/db/queries/jobs.query';

/**
 * Job queue API (MASTER_BUILD_SPEC.md §23.4 backend task 2, §8.5).
 *
 * Deliberately takes a client as a parameter rather than constructing one —
 * this module is NOT on the service-role allow-list in `eslint.config.mjs`
 * (only `lib/jobs/handlers/*` and the process route are). The caller
 * (`app/api/v1/jobs/process/route.ts`) constructs the admin client and
 * passes it in, keeping the boundary enforceable by the linter rather than
 * by convention alone.
 */

export interface EnqueueOptions {
  readonly priority?: number;
  readonly runAfter?: Date;
  readonly maxAttempts?: number;
}

export async function enqueue(
  supabase: SupabaseClient<Database>,
  orgId: string,
  jobType: JobType,
  payload: Json,
  options?: EnqueueOptions,
): Promise<Job> {
  return enqueueJob(supabase, {
    org_id: orgId,
    job_type: jobType,
    payload,
    ...(options?.priority !== undefined ? { priority: options.priority } : {}),
    ...(options?.runAfter ? { run_after: options.runAfter.toISOString() } : {}),
    ...(options?.maxAttempts !== undefined ? { max_attempts: options.maxAttempts } : {}),
  });
}

export { claimJobs, completeJob, failJob };
export type { Job };
