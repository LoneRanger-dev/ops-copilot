import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, JobType } from '@/types/database.types';
import type { Job } from '@/lib/db/queries/jobs.query';
import { completeJob, failJob } from '@/lib/db/queries/jobs.query';
import { logger } from '@/lib/observability/logger';
import { handleDocumentIngest } from '@/lib/jobs/handlers/document-ingest.handler';
import { handleDocumentReindex } from '@/lib/jobs/handlers/document-reindex.handler';

/**
 * Job dispatch (MASTER_BUILD_SPEC.md §23.4 backend task 3, §23.5 backend
 * task 8). `document.ingest`/`document.reindex` register here in Phase 5;
 * `incident.sync` (Phase 8), `memory.summarise` (Phase 6), and
 * `analytics.rollup`/`retention.purge` (Phase 9) each add their own entry
 * without touching this dispatcher.
 */
export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const HANDLERS: Partial<Record<JobType, JobHandler>> = {};

export function registerHandler(type: JobType, handler: JobHandler): void {
  HANDLERS[type] = handler;
}

registerHandler('document.ingest', handleDocumentIngest);
registerHandler('document.reindex', handleDocumentReindex);

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
