import { z } from 'zod';

/**
 * Server-side environment validation.
 *
 * SERVER ONLY. Never import this module from a Client Component. Next.js only
 * inlines `NEXT_PUBLIC_*` variables into the browser bundle, so every other
 * value would be `undefined` there and validation would throw at hydration.
 * Client-safe values live in `src/config/site.ts`.
 *
 * ---
 *
 * PORTABILITY CONTRACT (hackathon implementation override)
 *
 * `OPENAI_API_KEY` is the ONLY variable a fresh clone must supply. Every other
 * variable has a working local default, so `git clone && npm install && npm run
 * dev` starts a functioning application on any machine.
 *
 * Variables for infrastructure that arrives in later phases (Supabase, Postgres,
 * Redis) are OPTIONAL and typed `| undefined`. Consuming code must handle their
 * absence rather than assume them — which is also what makes the health endpoint
 * able to report honestly on what is and is not configured.
 *
 * Validation still runs at module load, and a malformed value still crashes the
 * process immediately (MASTER_BUILD_SPEC section 14.2). The change is to which
 * variables are *required*, not to how strictly they are checked.
 */

/**
 * Environment values are always strings, so a boolean flag is parsed rather
 * than coerced. The default is applied to the *string* before the transform
 * runs — putting it after would type the default as a boolean, which is not
 * what the pipeline accepts as input.
 */
function boolFlag(defaultValue: boolean) {
  return z
    .string()
    .default(String(defaultValue))
    .transform((v) => v === 'true')
    .pipe(z.boolean());
}

/**
 * A URL restricted to specific protocols.
 *
 * `z.string().url()` alone is too permissive: WHATWG URL parsing accepts
 * `localhost:3000` as valid, reading `localhost:` as the protocol. That value
 * would pass validation and then silently produce broken absolute links, which
 * is precisely the class of failure this schema exists to prevent.
 */
function urlWithProtocol(protocols: readonly string[], example: string) {
  const allowed = protocols.map((p) => `${p}:`);
  return z
    .string()
    .url()
    .refine(
      (value) => {
        try {
          return allowed.includes(new URL(value).protocol);
        } catch {
          return false;
        }
      },
      { message: `Must be a ${protocols.join(' or ')} URL, e.g. ${example}` },
    );
}

const httpUrl = urlWithProtocol(['http', 'https'], 'http://localhost:3000');
const postgresUrl = urlWithProtocol(
  ['postgresql', 'postgres'],
  'postgresql://user:pass@host:5432/db',
);
const redisUrl = urlWithProtocol(['redis', 'rediss'], 'redis://localhost:6379');

/** Development-only fallback. The production guard below rejects it. */
const DEV_CRON_SECRET = 'dev-only-cron-secret-not-for-production-use-0123';

export const envSchema = z.object({
  // -- The only required variable -------------------------------------------
  OPENAI_API_KEY: z
    .string({ required_error: 'Required. Paste your key into .env.local.' })
    .startsWith('sk-', 'Must be an OpenAI key beginning with "sk-".'),

  // -- Application ----------------------------------------------------------
  NEXT_PUBLIC_APP_URL: httpUrl.default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('OpsCopilot'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // -- OpenAI ---------------------------------------------------------------
  OPENAI_MODEL_PRIMARY: z.string().default('gpt-4o'),
  OPENAI_MODEL_FAST: z.string().default('gpt-4o-mini'),
  OPENAI_MODEL_FALLBACK: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  MAX_CONTEXT_TOKENS: z.coerce.number().int().positive().default(12000),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2500),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  OPENAI_EMBEDDING_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  OPENAI_MAX_CONCURRENCY: z.coerce.number().int().positive().default(10),

  // -- Supabase (Phase 2). Optional: absent on a fresh clone. ---------------
  NEXT_PUBLIC_SUPABASE_URL: httpUrl.optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  // -- Postgres (Phase 4). Optional: absent on a fresh clone. ---------------
  DATABASE_URL: postgresUrl.optional(),
  DATABASE_POOL_URL: postgresUrl.optional(),

  // -- Redis (Phase 6). Optional: the cache degrades to direct computation. --
  REDIS_URL: redisUrl.optional(),
  REDIS_PREFIX: z.string().default('opscopilot:dev'),
  SEMANTIC_CACHE_THRESHOLD: z.coerce.number().min(0.9).max(1).default(0.95),
  REDIS_FAIL_OPEN: boolFlag(true),

  // -- RAG ------------------------------------------------------------------
  CHUNK_SIZE_TOKENS: z.coerce.number().int().min(200).max(2000).default(800),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().int().nonnegative().default(120),
  RAG_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.55),
  MAX_RETRIEVAL_PASSES: z.coerce.number().int().min(1).max(5).default(3),

  // -- Agents ---------------------------------------------------------------
  MAX_AGENT_STEPS: z.coerce.number().int().min(1).max(10).default(6),
  AGENT_DEADLINE_MS: z.coerce.number().int().positive().default(45000),
  WIDGET_DEADLINE_MS: z.coerce.number().int().positive().default(8000),

  // -- Security -------------------------------------------------------------
  CRON_SECRET: z.string().min(32).default(DEV_CRON_SECRET),
  PII_REDACTION_ENABLED: boolFlag(true),
  DEMO_MODE: boolFlag(true),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Invalid environment configuration:\n${issues}\n\n` +
      'Copy .env.example to .env.local and set OPENAI_API_KEY.\n' +
      'Every other variable has a working local default.',
  );
}

export const env: Env = parsed.data;

/**
 * Production guards. These are correctness failures, not warnings.
 *
 * Skipped during `next build`, which forces NODE_ENV=production regardless of
 * the environment it runs in. These assertions are about a *deployed runtime*
 * being misconfigured; a build machine legitimately holds development values,
 * and failing the build for that would be a false positive.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuildPhase && env.NODE_ENV === 'production') {
  if (env.DEMO_MODE) {
    throw new Error('DEMO_MODE must be false in production.');
  }
  if (!env.PII_REDACTION_ENABLED) {
    throw new Error('PII_REDACTION_ENABLED must be true in production.');
  }
  if (env.NEXT_PUBLIC_APP_URL.startsWith('http://')) {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production.');
  }
  if (env.CRON_SECRET === DEV_CRON_SECRET) {
    throw new Error(
      'CRON_SECRET is still the development default. Generate one with: openssl rand -hex 32',
    );
  }
}

/**
 * Which optional infrastructure is configured. Consumers branch on these rather
 * than assuming a connection string exists.
 */
export const isConfigured = {
  supabase: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  database: Boolean(env.DATABASE_URL),
  redis: Boolean(env.REDIS_URL),
} as const;
