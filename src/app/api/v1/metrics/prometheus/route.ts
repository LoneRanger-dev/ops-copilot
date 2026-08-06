import { NextResponse } from 'next/server';
import metrics from '@/lib/observability/metrics';
import { cacheMget, cacheKeys } from '@/lib/cache/redis';
import { isConfigured } from '@/config/env';

function renderPrometheus(counters: Record<string, number>): string {
  // Use a single metric name and expose keys as a label for flexibility.
  const lines: string[] = [];
  lines.push('# HELP ops_copilot_counter Generic counters for ops-copilot');
  lines.push('# TYPE ops_copilot_counter counter');
  for (const [k, v] of Object.entries(counters)) {
    const label = `name=\"${k}\"`;
    lines.push(`ops_copilot_counter{${label}} ${v}`);
  }
  return lines.join('\n') + '\n';
}

export async function GET() {
  const inMemory = metrics.getCounters();

  // If Redis is configured, prefer Redis-aggregated values for keys that
  // exist there; otherwise fall back to in-memory counters. This keeps the
  // exporter useful in single-process dev and aggregated in-prod.
  if (isConfigured.redis) {
    try {
      const keys = await cacheKeys('metrics:*');
      if (keys.length > 0) {
        const vals = await cacheMget(keys);
        const out: Record<string, number> = { ...inMemory };
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const raw = vals[i];
          const metricName = key.replace(/^metrics:/, '');
          const n = raw ? Number(raw) || 0 : 0;
          out[metricName] = n;
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
