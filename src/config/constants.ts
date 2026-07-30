/**
 * Application-wide constants that are not environment-dependent.
 * Environment-dependent values belong in `src/config/env.ts`.
 */

/** API surface version prefix (MASTER_BUILD_SPEC section 8.4). */
export const API_VERSION = 'v1' as const;
export const API_PREFIX = `/api/${API_VERSION}` as const;

/** User roles (MASTER_BUILD_SPEC section 16.7, assumption A-08). */
export const USER_ROLES = ['end_user', 'support_engineer', 'manager', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** AI surfaces. The widget is firewalled from ServiceNow (section 10.3). */
export const SURFACES = ['chat', 'widget'] as const;
export type Surface = (typeof SURFACES)[number];

/** Stable machine-readable API error codes (section 8.3). */
export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  GUARDRAIL_BLOCKED: 'GUARDRAIL_BLOCKED',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Health check timeout per dependency, milliseconds. */
export const HEALTH_CHECK_TIMEOUT_MS = 1000;
