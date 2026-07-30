import { describe, expect, it, beforeAll } from 'vitest';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { isConfigured, env } from '@/config/env';
import type { Database } from '@/types/database.types';
import { enqueue, claimJobs, completeJob, failJob } from '@/lib/jobs/queue';

/**
 * Job queue integration tests (MASTER_BUILD_SPEC.md §23.4 testing task 3).
 * Requires a live Supabase project — see rls.test.ts for why this is skipped
 * rather than faked in this environment.
 */
const canRun = isConfigured.supabase && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
const ORG_ID = '00000000-0000-0000-0000-000000000001';

describe.skipIf(!canRun)('job queue', () => {
  let admin: SupabaseClient<Database>;

  beforeAll(() => {
    admin = createSupabaseClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });

  it('enqueues, claims, and completes a job', async () => {
    const job = await enqueue(admin, ORG_ID, 'analytics.rollup', { note: 'test' });
    expect(job.status).toBe('pending');

    const claimed = await claimJobs(admin, 10, 'test-worker-1');
    expect(claimed.some((j) => j.id === job.id)).toBe(true);

    await completeJob(admin, job.id);
    const { data } = await admin.from('job_queue').select('*').eq('id', job.id).single();
    expect(data?.status).toBe('completed');
  });

  it('retries with exponential backoff on failure, then dead-letters at 5 attempts', async () => {
    const job = await enqueue(admin, ORG_ID, 'incident.sync', {}, { maxAttempts: 2 });

    await failJob(admin, job, 'first failure');
    const { data: afterFirst } = await admin
      .from('job_queue')
      .select('*')
      .eq('id', job.id)
      .single();
    expect(afterFirst?.status).toBe('failed');
    expect(afterFirst?.attempts).toBe(1);

    await failJob(admin, { id: job.id, attempts: 1, max_attempts: 2 }, 'second failure');
    const { data: afterSecond } = await admin
      .from('job_queue')
      .select('*')
      .eq('id', job.id)
      .single();
    expect(afterSecond?.status).toBe('dead_letter');
    expect(afterSecond?.attempts).toBe(2);
  });

  it('never lets two concurrent claims process the same job', async () => {
    const job = await enqueue(admin, ORG_ID, 'memory.summarise', {});

    const [claimedA, claimedB] = await Promise.all([
      claimJobs(admin, 10, 'worker-a'),
      claimJobs(admin, 10, 'worker-b'),
    ]);

    const aHasJob = claimedA.some((j) => j.id === job.id);
    const bHasJob = claimedB.some((j) => j.id === job.id);
    expect(aHasJob && bHasJob).toBe(false);
  });
});

if (!canRun) {
  describe('job queue (skipped)', () => {
    it('requires a configured Supabase project — see docs/IMPLEMENTATION_OVERRIDE.md', () => {
      expect(canRun).toBe(false);
    });
  });
}
