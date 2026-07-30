import { timingSafeEqual } from 'node:crypto';
import { env, isConfigured } from '@/config/env';
import { createAdminClient } from '@/lib/db/admin';
import { claimJobs } from '@/lib/db/queries/jobs.query';
import { processJob } from '@/lib/jobs/worker';
import { errorResponse, newRequestId, successResponse } from '@/lib/api/responses';
import { UnauthenticatedError } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';

/**
 * Job worker tick (MASTER_BUILD_SPEC.md §23.4 backend task 4, §8.5).
 * Triggered by `pg_cron` every 60s (`015_cron.sql`) once a live Supabase
 * project sets `app.base_url`/`app.cron_secret`. Auth is a constant-time
 * comparison of `x-cron-secret` against `CRON_SECRET` — never a `===`,
 * which leaks timing information about how many leading bytes matched.
 */

const CLAIM_LIMIT = 10;

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export async function POST(request: Request): Promise<Response> {
  const requestId = newRequestId();
  const startedAt = Date.now();

  try {
    const provided = request.headers.get('x-cron-secret') ?? '';
    if (!provided || !constantTimeEquals(provided, env.CRON_SECRET)) {
      throw new UnauthenticatedError('Invalid or missing x-cron-secret.');
    }

    if (!isConfigured.supabase) {
      return successResponse(
        {
          processed: 0,
          results: [],
          note: 'Supabase not configured — job queue is inactive.',
        },
        requestId,
        startedAt,
      );
    }

    const supabase = createAdminClient();
    const jobs = await claimJobs(supabase, CLAIM_LIMIT, `worker-${requestId}`);
    const results = await Promise.all(jobs.map((job) => processJob(supabase, job)));

    logger.info({ requestId, claimed: jobs.length }, 'Job queue tick processed');
    return successResponse({ processed: jobs.length, results }, requestId, startedAt);
  } catch (error) {
    return errorResponse(error, requestId, startedAt);
  }
}
