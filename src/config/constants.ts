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

/**
 * User preferences (MASTER_BUILD_SPEC section 3.9, `profiles.preferences`).
 * Persisted per-user so theme and density follow them across devices
 * (§23.3 backend task 3).
 */
export const THEME_VALUES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_VALUES)[number];

export const DENSITY_VALUES = ['comfortable', 'compact'] as const;
export type DensityPreference = (typeof DENSITY_VALUES)[number];

export interface UserPreferences {
  readonly theme: ThemePreference;
  readonly density: DensityPreference;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  density: 'comfortable',
};

/** Narrows an untyped JSON value (e.g. Supabase `profiles.preferences`) safely. */
export function parsePreferences(value: unknown): UserPreferences {
  if (typeof value !== 'object' || value === null) return DEFAULT_PREFERENCES;
  const candidate = value as Record<string, unknown>;
  const theme = THEME_VALUES.includes(candidate.theme as ThemePreference)
    ? (candidate.theme as ThemePreference)
    : DEFAULT_PREFERENCES.theme;
  const density = DENSITY_VALUES.includes(candidate.density as DensityPreference)
    ? (candidate.density as DensityPreference)
    : DEFAULT_PREFERENCES.density;
  return { theme, density };
}
