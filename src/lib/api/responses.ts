import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import type { ApiFailure, ApiMeta, ApiSuccess } from '@/types';
import { AppError, InternalError, isAppError } from './errors';

/** `req_` + 20 URL-safe characters — readable in logs, unguessable. */
export function newRequestId(): string {
  return `req_${nanoid(20)}`;
}

function meta(requestId: string, startedAt: number, extra?: Partial<ApiMeta>): ApiMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    ...extra,
  };
}

/** Success envelope (MASTER_BUILD_SPEC.md §8.2). */
export function successResponse<T>(
  data: T,
  requestId: string,
  startedAt: number,
  init?: { status?: number },
): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = { success: true, data, meta: meta(requestId, startedAt) };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

/** Failure envelope. Accepts any `AppError`; anything else is wrapped. */
export function errorResponse(
  error: unknown,
  requestId: string,
  startedAt: number,
): NextResponse<ApiFailure> {
  const appError: AppError = isAppError(error)
    ? error
    : new InternalError(
        error instanceof Error ? undefined : 'An unexpected error occurred.',
      );

  const body: ApiFailure = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
    meta: meta(requestId, startedAt),
  };

  const response = NextResponse.json(body, { status: appError.httpStatus });

  if (appError.constructor.name === 'RateLimitError' && 'retryAfterSeconds' in appError) {
    response.headers.set(
      'Retry-After',
      String((appError as { retryAfterSeconds: number }).retryAfterSeconds),
    );
  }

  return response;
}
