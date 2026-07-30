import { format, formatDistanceToNowStrict, isValid } from 'date-fns';

/** Formatting helpers. Pure and dependency-light (MASTER_BUILD_SPEC section 13.3). */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Human-readable byte size. Uses binary units (1024) because that is what
 * filesystems and upload limits actually measure.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  const unit = BYTE_UNITS[exponent] ?? 'B';

  // Whole bytes never need a decimal point.
  return exponent === 0 ? `${value} ${unit}` : `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Human-readable duration from milliseconds. Latency budgets in this system are
 * expressed in ms and seconds, so those are the units that matter.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${remainder}s`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/** Absolute date, e.g. "30 Jul 2026, 14:22". Returns an em dash for invalid input. */
export function formatDateTime(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'd MMM yyyy, HH:mm') : '—';
}

/** Date only, e.g. "30 Jul 2026". */
export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'd MMM yyyy') : '—';
}

/** Relative time, e.g. "12 minutes ago". Used for cache staleness notices. */
export function formatRelativeTime(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** USD cost with 4 decimal places — AI spend is routinely sub-cent. */
export function formatCost(usd: number): string {
  if (!Number.isFinite(usd) || usd < 0) return '—';
  return `$${usd.toFixed(4)}`;
}

/** Thousands-separated integer. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB').format(value);
}

/** Percentage from a 0..1 ratio, e.g. 0.342 -> "34.2%". */
export function formatPercent(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(decimals)}%`;
}
