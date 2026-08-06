import { NextResponse } from 'next/server';
import metrics from '@/lib/observability/metrics';
import { cacheMget, cacheSMembers } from '@/lib/cache/redis';
import { isConfigured } from '@/config/env';
import { renderPrometheus } from '@/lib/observability/prometheus';

export async function GET() {
  const inMemory = metrics.getCounters();

  // If Redis is configured, prefer Redis-aggregated values for keys that
  // exist there; otherwise fall back to in-memory counters. This keeps the
  // exporter useful in single-process dev and aggregated in-prod.
  if (isConfigured.redis) {
    try {
      const names = await cacheSMembers('metrics:names');
      if (names.length > 0) {
        const keys = names.map((n) => `metrics:${n}`);
        const vals = await cacheMget(keys);
        const out: Record<string, number> = { ...inMemory };
        for (let i = 0; i < names.length; i++) {
          const name = names[i];
          if (!name) continue;
          const raw = vals[i];
          const n = raw ? Number(raw) || 0 : 0;
          out[name] = n;
        }
        return new NextResponse(renderPrometheus(out), {
          headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
        });
      }
    } catch {
      // fall back to in-memory exporter on any Redis failure
    }
  }

  return new NextResponse(renderPrometheus(inMemory), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
  });
}

export default GET;
