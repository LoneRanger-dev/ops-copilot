import type { Route } from 'next';

/**
 * The single cast point for a `Route` built from a runtime string.
 *
 * `next.config.ts` enables `typedRoutes`, which only infers a valid `Route`
 * from a string *literal* written directly at the `Link href={...}` /
 * `router.push(...)` call site — a value that has passed through a `string`-
 * typed variable (nav config, a derived breadcrumb path, a stored redirect
 * target) never satisfies it structurally. Centralising the cast here keeps
 * it to one place per call site rather than scattering `as Route` through
 * the component tree; the actual safety guarantee (that these paths are
 * real, non-attacker-controlled routes) comes from where the string was
 * built, not from this function.
 */
export function toRoute(path: string): Route {
  return path as Route;
}
