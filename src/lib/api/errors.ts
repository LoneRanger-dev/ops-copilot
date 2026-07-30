import { ERROR_CODES, type ErrorCode } from '@/config/constants';
import type { ApiErrorDetail } from '@/types';

/**
 * The `AppError` hierarchy (MASTER_BUILD_SPEC.md §8.3).
 *
 * Every error thrown from route-handler business logic SHOULD be one of
 * these. `lib/api/handler.ts` catches `AppError` and maps it to the response
 * envelope directly; anything else is treated as unexpected and collapses to
 * `INTERNAL_ERROR` so internals never leak to a client.
 */
export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;
  readonly details?: readonly ApiErrorDetail[];

  constructor(message: string, details?: readonly ApiErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    if (details) this.details = details;
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = ERROR_CODES.UNAUTHENTICATED;
  readonly httpStatus = 401;
  constructor(message = 'Authentication required.') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = ERROR_CODES.FORBIDDEN;
  readonly httpStatus = 403;
  constructor(permission?: string) {
    super(
      permission
        ? `Missing permission: ${permission}.`
        : 'You cannot perform this action.',
    );
  }
}

export class NotFoundError extends AppError {
  readonly code = ERROR_CODES.RESOURCE_NOT_FOUND;
  readonly httpStatus = 404;
  constructor(message = 'The requested resource was not found.') {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly code = ERROR_CODES.VALIDATION_FAILED;
  readonly httpStatus = 422;
  constructor(details: readonly ApiErrorDetail[], message = 'Validation failed.') {
    super(message, details);
  }
}

export class RateLimitError extends AppError {
  readonly code = ERROR_CODES.RATE_LIMIT_EXCEEDED;
  readonly httpStatus = 429;
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = 'Rate limit exceeded.') {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class UpstreamUnavailableError extends AppError {
  readonly code = ERROR_CODES.UPSTREAM_UNAVAILABLE;
  readonly httpStatus = 502;
  constructor(message = 'An upstream dependency is unavailable.') {
    super(message);
  }
}

export class UpstreamTimeoutError extends AppError {
  readonly code = ERROR_CODES.UPSTREAM_TIMEOUT;
  readonly httpStatus = 504;
  constructor(message = 'An upstream dependency timed out.') {
    super(message);
  }
}

export class GuardrailBlockedError extends AppError {
  readonly code = ERROR_CODES.GUARDRAIL_BLOCKED;
  readonly httpStatus = 400;
  constructor(message = 'This request was blocked by a safety guardrail.') {
    super(message);
  }
}

export class ContentTooLargeError extends AppError {
  readonly code = ERROR_CODES.CONTENT_TOO_LARGE;
  readonly httpStatus = 413;
  constructor(message = 'The upload or context exceeds the allowed size.') {
    super(message);
  }
}

export class InternalError extends AppError {
  readonly code = ERROR_CODES.INTERNAL_ERROR;
  readonly httpStatus = 500;
  constructor(message = 'An unexpected error occurred.') {
    super(message);
  }
}

/** True for anything this module defines. Used by the handler's catch-all. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
