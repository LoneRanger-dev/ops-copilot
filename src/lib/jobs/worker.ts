import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, JobType } from '@/types/database.types';
import type { Job } from '@/lib/db/queries/jobs.query';
import { completeJob, failJob } from '@/lib/db/queries/jobs.query';
import { logger } from '@/lib/observability/logger';

/**
 * Job dispatch (MASTER_BUILD_SPEC.md §23.4 backend task 3). Handlers are
 * registered empty this phase — `document.ingest` arrives in Phase 5,
 * `incident.sync` in Phase 8, `memory.summarise` in Phase 6,
 * `analytics.rollup`/`retention.purge` in Phase 9 — each phase fills in its
 * own entry in `HANDLERS` without touching this dispatcher.
 */
export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const HANDLERS: Partial<Record<JobType, JobHandler>> = {};

export function registerHandler(type: JobType, handler: JobHandler): void {
  HANDLERS[type] = handler;
}

export interface WorkerResult {
  readonly jobId: string;
  readonly jobType: JobType;
  readonly status: 'completed' | 'failed' | 'dead_letter' | 'no_handler';
}

export async function processJob(
  supabase: SupabaseClient<Database>,
  job: Job,
): Promise<WorkerResult> {
  const handler = HANDLERS[job.job_type];

  if (!handler) {
    logger.warn(
      { jobId: job.id, jobType: job.job_type },
      'No handler registered for job type',
    );
    await completeJob(supabase, job.id); // nothing to do; don't retry forever
    return { jobId: job.id, jobType: job.job_type, status: 'no_handler' };
  }

  try {
    await handler(job.payload as Record<string, unknown>);
    await completeJob(supabase, job.id);
    return { jobId: job.id, jobType: job.job_type, status: 'completed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown job failure';
    await failJob(supabase, job, message);
    const deadLettered = job.attempts + 1 >= job.max_attempts;
    logger.error({ jobId: job.id, jobType: job.job_type, error: message }, 'Job failed');
    return {
      jobId: job.id,
      jobType: job.job_type,
      status: deadLettered ? 'dead_letter' : 'failed',
    };
  }
}
