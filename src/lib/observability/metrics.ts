import { cacheIncrWithWindow } from '@/lib/cache/redis';
import { isConfigured } from '@/config/env';

const counters = new Map<string, number>();

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

export function resetCountersForTests(): void {
  counters.clear();
}

const metrics = { incrCounter, getCounters, resetCountersForTests };
export default metrics;
