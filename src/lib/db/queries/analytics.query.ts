import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Analytics aggregate queries (MASTER_BUILD_SPEC.md §23.9, FR-ANLY-1/2). Reads
 * directly from `ai_traces`/`feedback` rather than a materialised rollup
 * table — the `analytics.rollup` job (`012_jobs.sql`) exists for the volumes
 * where this becomes too slow, but this project's scale does not need it yet.
 */

export interface AnalyticsOverview {
  readonly totalSessions: number;
  readonly deflectionRate: number;
  readonly thumbsUpRate: number;
  readonly medianCostUsd: number;
}

export async function getAnalyticsOverview(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<AnalyticsOverview> {
  const [{ data: traces, error: tracesError }, { data: feedback, error: feedbackError }] =
    await Promise.all([
      supabase
        .from('ai_traces')
        .select('status, total_cost_usd')
        .eq('org_id', orgId)
        .limit(5000),
      supabase.from('feedback').select('rating').eq('org_id', orgId).limit(5000),
    ]);
  if (tracesError) throw tracesError;
  if (feedbackError) throw feedbackError;

  const totalSessions = traces?.length ?? 0;
  const escalated =
    traces?.filter((t) => t.status === 'blocked' || t.status === 'failed').length ?? 0;
  const deflectionRate =
    totalSessions > 0 ? (totalSessions - escalated) / totalSessions : 0;

  const positive = feedback?.filter((f) => f.rating === 'positive').length ?? 0;
  const thumbsUpRate = feedback && feedback.length > 0 ? positive / feedback.length : 0;

  const costs = (traces ?? []).map((t) => t.total_cost_usd).sort((a, b) => a - b);
  const medianCostUsd = costs.length > 0 ? (costs[Math.floor(costs.length / 2)] ?? 0) : 0;

  return { totalSessions, deflectionRate, thumbsUpRate, medianCostUsd };
}
