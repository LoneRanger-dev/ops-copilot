/**
 * Structured JSON logger (MASTER_BUILD_SPEC section 4.6).
 *
 * Dependency-free by design: it must run unchanged in the Node.js runtime, the
 * Edge runtime, and Vitest. Transport-based loggers need per-runtime shims that
 * buy nothing here, since the deployment target ingests stdout JSON either way.
 *
 * Every log line carries a correlation ID when one is supplied, so a single
 * request can be followed across request -> agent -> tool -> model call.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Field names whose values are never written to a log, at any level.
 * Matching is case-insensitive and substring-based, so `openaiApiKey`,
 * `OPENAI_API_KEY`, and `api_key` are all caught.
 */
const REDACTED_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'credential',
  'privatekey',
  'private_key',
  'service_role',
  'serviceRole',
] as const;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;

function isRedactedKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[-_]/g, '');
  return REDACTED_KEY_PATTERNS.some((pattern) =>
    normalised.includes(pattern.toLowerCase().replace(/[-_]/g, '')),
  );
}

/**
 * Recursively strip sensitive values. Depth-bounded so a cyclic or pathological
 * object cannot stall the logger.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (value === null || typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isRedactedKey(key) ? REDACTED : redact(item, depth + 1);
  }
  return output;
}

export interface LogContext {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly userId?: string;
  readonly [key: string]: unknown;
}

interface LogRecord {
  readonly level: LogLevel;
  readonly time: string;
  readonly msg: string;
  readonly [key: string]: unknown;
}

function resolveMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return LOG_LEVELS.includes(raw as LogLevel) ? (raw as LogLevel) : 'info';
}

function write(level: LogLevel, context: LogContext, msg: string): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[resolveMinLevel()]) return;

  const record: LogRecord = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(redact(context) as Record<string, unknown>),
  };

  const line = JSON.stringify(record);

  // stdout/stderr is the log transport. `no-console` is disabled for this file
  // in eslint.config.mjs — this module owns the boundary.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export interface Logger {
  debug(context: LogContext, msg: string): void;
  info(context: LogContext, msg: string): void;
  warn(context: LogContext, msg: string): void;
  error(context: LogContext, msg: string): void;
  /** Derive a logger that stamps every line with the given bindings. */
  child(bindings: LogContext): Logger;
}

function createLogger(bindings: LogContext = {}): Logger {
  return {
    debug: (context, msg) => write('debug', { ...bindings, ...context }, msg),
    info: (context, msg) => write('info', { ...bindings, ...context }, msg),
    warn: (context, msg) => write('warn', { ...bindings, ...context }, msg),
    error: (context, msg) => write('error', { ...bindings, ...context }, msg),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

export const logger: Logger = createLogger();
