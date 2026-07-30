import { Client } from 'pg';
import Redis from 'ioredis';
import { env, isConfigured } from '@/config/env';
import { HEALTH_CHECK_TIMEOUT_MS } from '@/config/constants';
import { logger } from '@/lib/observability/logger';
import type { DependencyHealth, DependencyStatus, HealthReport } from '@/types';

/**
 * `GET /api/v1/health` — public, unauthenticated, used by uptime monitoring
 * (MASTER_BUILD_SPEC section 22.3).
 *
 * Postgres and Redis are OPTIONAL until Phases 4 and 6 respectively. A fresh
 * clone has neither, and that is a supported state — so an unconfigured
 * dependency reports `not_configured`, not `down`. Only a dependency that is
 * configured but unreachable is a failure.
 *
 * Returns 200 for `up` and `degraded`, 503 for `down`, so a load balancer
 * removes only genuinely broken instances.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_VERSION = '0.1.0';

/** Bound every probe so one hung dependency cannot stall the endpoint. */
async function withTimeout<T>(operation: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function notConfigured(requiredFrom: string): DependencyHealth {
  return {
    status: 'not_configured',
    latencyMs: null,
    note: `Not configured. Optional until ${requiredFrom}.`,
  };
}

async function checkPostgres(): Promise<DependencyHealth> {
  if (!isConfigured.database) return notConfigured('Phase 4');

  const started = Date.now();
  const client = new Client({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: HEALTH_CHECK_TIMEOUT_MS,
  });

  try {
    await withTimeout(client.connect(), HEALTH_CHECK_TIMEOUT_MS);
    await withTimeout(client.query('select 1'), HEALTH_CHECK_TIMEOUT_MS);
    return { status: 'up', latencyMs: Date.now() - started };
  } catch (error) {
    logger.warn({ err: error }, 'Health check failed: postgres');
    return {
      status: 'down',
      latencyMs: null,
      note: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // end() rejects if connect() never succeeded; that is not a health signal.
    await client.end().catch(() => undefined);
  }
}

async function checkRedis(): Promise<DependencyHealth> {
  if (!isConfigured.redis || !env.REDIS_URL) return notConfigured('Phase 6');

  const started = Date.now();
  const redis = new Redis(env.REDIS_URL, {
    connectTimeout: HEALTH_CHECK_TIMEOUT_MS,
    commandTimeout: HEALTH_CHECK_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  try {
    await withTimeout(redis.connect(), HEALTH_CHECK_TIMEOUT_MS);
    await withTimeout(redis.ping(), HEALTH_CHECK_TIMEOUT_MS);
    return { status: 'up', latencyMs: Date.now() - started };
  } catch (error) {
    logger.warn({ err: error }, 'Health check failed: redis');
    return {
      status: 'down',
      latencyMs: null,
      note: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    redis.disconnect();
  }
}

/**
 * Overall status.
 *
 * Nothing is a hard dependency yet: the application serves without Postgres or
 * Redis through Phase 3. A configured-but-unreachable dependency degrades the
 * report; an unconfigured one does not, because that is the documented state of
 * a fresh clone. Postgres becomes a hard dependency in Phase 4, at which point
 * this function gains a `down` branch.
 */
function overallStatus(deps: Record<string, DependencyHealth>): DependencyStatus {
  return Object.values(deps).some((d) => d.status === 'down') ? 'degraded' : 'up';
}

export async function GET(): Promise<Response> {
  const [database, redis] = await Promise.all([checkPostgres(), checkRedis()]);

  const dependencies: Record<string, DependencyHealth> = { database, redis };
  const status = overallStatus(dependencies);

  const report: HealthReport = {
    status,
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    dependencies,
  };

  return Response.json(report, {
    status: status === 'down' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
