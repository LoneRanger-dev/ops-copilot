import { cacheIncrWithWindow, cacheSAdd } from '@/lib/cache/redis';
import { isConfigured } from '@/config/env';

const counters = new Map<string, number>();
const histograms = new Map<
  string,
  { buckets: number[]; counts: number[]; sum: number; count: number }
>();

export function incrCounter(name: string, value = 1): void {
  const next = (counters.get(name) ?? 0) + value;
  counters.set(name, next);

  // Fire-and-forget persistence to Redis when available. Do not await so
  // callers remain synchronous — the in-memory snapshot is authoritative
  // for the current process and tests.
  if (isConfigured.redis) {
    // Use Redis INCR for atomic increments. Fire-and-forget.
    (async () => {
      try {
        await cacheIncrWithWindow(`metrics:${name}`, 60 * 60 * 24 * 7);
        // Record the metric name in a Redis set for efficient listing.
        await cacheSAdd('metrics:names', name);
      } catch {
        // Swallow Redis errors; metrics are best-effort.
      }
    })();
  }
}

export function getCounters(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of counters.entries()) out[k] = v;
  return out;
}

export function observeHistogram(name: string, valueMs: number, buckets?: number[]) {
  const defaultBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const b = buckets ?? defaultBuckets;
  let h = histograms.get(name);
  if (!h) {
    h = { buckets: b, counts: new Array(b.length).fill(0), sum: 0, count: 0 };
    histograms.set(name, h);
  }
  h.sum += valueMs;
  h.count += 1;
  for (let i = 0; i < h.buckets.length; i++) {
    if (valueMs <= h.buckets[i]) {
      h.counts[i] += 1;
      break;
    }
  }
}

export function getHistograms(): Record<
  string,
  { buckets: number[]; counts: number[]; sum: number; count: number }
> {
  const out: Record<
    string,
    { buckets: number[]; counts: number[]; sum: number; count: number }
  > = {};
  for (const [k, v] of histograms.entries()) out[k] = { ...v };
  return out;
}

export function resetCountersForTests(): void {
  counters.clear();
  histograms.clear();
}

const metrics = { incrCounter, getCounters, resetCountersForTests };
export default metrics;
