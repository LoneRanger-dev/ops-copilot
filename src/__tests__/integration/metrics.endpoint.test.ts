import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Redis helpers used by the exporter to return a known metric name and value
vi.mock('@/lib/cache/redis', () => ({
  cacheSMembers: vi.fn(async () => ['alpha']),
  cacheMget: vi.fn(async () => ['10']),
}));

const metrics = await import('@/lib/observability/metrics');
const prometheusRoute = await import('@/app/api/v1/metrics/prometheus/route');

describe('metrics exporter (integration)', () => {
  beforeEach(() => {
    metrics.resetCountersForTests();
  });

  it('exports counters and histograms in Prometheus text format', async () => {
    // populate counters and histograms in-process
    metrics.incrCounter('alpha', 10);
    metrics.observeHistogram('reranker_latency_ms', 123);

    const res = await prometheusRoute.GET();
    const text = await res.text();

    expect(text).toContain('ops_copilot_counter{name="alpha"} 10');
    expect(text).toContain('ops_copilot_histogram_reranker_latency_ms_sum');
    expect(text).toContain('ops_copilot_histogram_reranker_latency_ms_count');
  });
});
