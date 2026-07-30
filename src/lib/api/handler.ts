import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/config/constants';
import { requireRole, requireUser, type AuthUser } from '@/lib/auth/server';
import { errorResponse, newRequestId, successResponse } from '@/lib/api/responses';
import { isAppError } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';

/**
 * The five-stage API pipeline (MASTER_BUILD_SPEC.md §8.1), stages 1-3 and 5.
 * Stage 4 (rate limiting) is a documented no-op until Redis exists in Phase 6
 * — see the inline note below, which is exactly what §8.6's `REDIS_FAIL_OPEN`
 * philosophy asks for: the gap is visible, not silent.
 */
export interface HandlerContext<TParams = Record<string, string>> {
  readonly request: NextRequest;
  readonly user: AuthUser;
  readonly params: TParams;
  readonly requestId: string;
}

export interface CreateHandlerOptions {
  /** Minimum role required (layer 2). Omit for "any authenticated user". */
  readonly requireMinRole?: UserRole;
}

type RouteFn<TParams, TData> = (ctx: HandlerContext<TParams>) => Promise<TData>;

/**
 * Wraps a Next.js Route Handler with auth, authorisation, and a uniform
 * response envelope (§8.2). Validation is the caller's job via
 * `lib/api/validation.ts` inside the handler body, since body/query shapes
 * are route-specific.
 */
export function createHandler<TParams = Record<string, string>, TData = unknown>(
  options: CreateHandlerOptions,
  fn: RouteFn<TParams, TData>,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> },
  ): Promise<NextResponse> => {
    const requestId = newRequestId();
    const startedAt = Date.now();
    const log = logger.child({ requestId });

    try {
      // Stage 1: Authenticate
      const user = options.requireMinRole
        ? await requireRole(options.requireMinRole) // Stage 2: Authorise (min role)
        : await requireUser();

      // Stage 4: Rate limit — no-op until Phase 6 (Redis token bucket, §16.8).
      // Every route that reaches here today is unthrottled by design, not omission.

      const params = await context.params;

      // Stage 5: Execute
      const data = await fn({ request, user, params, requestId });
      return successResponse(data, requestId, startedAt);
    } catch (error) {
      if (!isAppError(error)) {
        log.error({ err: String(error) }, 'Unhandled error in API handler');
      }
      return errorResponse(error, requestId, startedAt);
    }
  };
}
