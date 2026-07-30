import { describe, expect, it } from 'vitest';
import { envSchema } from '@/config/env';

/**
 * The env module validates at load and throws on a malformed value — that
 * behaviour is the point (section 14.2). These tests exercise the schema
 * directly so the failure modes are asserted without crashing the test run.
 *
 * The portability contract is the headline assertion here: a fresh clone
 * supplying only OPENAI_API_KEY must produce a fully valid configuration.
 */

const MINIMAL_ENV = { OPENAI_API_KEY: 'sk-test-key' } as const;

describe('envSchema — portability contract', () => {
  it('accepts an environment containing nothing but OPENAI_API_KEY', () => {
    const result = envSchema.safeParse(MINIMAL_ENV);
    expect(result.success).toBe(true);
  });

  it('rejects an environment with no OPENAI_API_KEY, naming the variable', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('OPENAI_API_KEY');
    }
  });

  it('rejects an OpenAI key that is not in the expected format', () => {
    const result = envSchema.safeParse({ OPENAI_API_KEY: 'not-a-real-key' });
    expect(result.success).toBe(false);
  });

  it('leaves optional infrastructure undefined rather than inventing values', () => {
    const result = envSchema.safeParse(MINIMAL_ENV);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBeUndefined();
      expect(result.data.REDIS_URL).toBeUndefined();
      expect(result.data.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
      expect(result.data.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    }
  });
});

describe('envSchema — defaults', () => {
  it('applies documented defaults when optional variables are absent', () => {
    const result = envSchema.safeParse(MINIMAL_ENV);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
      expect(result.data.NEXT_PUBLIC_APP_NAME).toBe('OpsCopilot');
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.OPENAI_MODEL_PRIMARY).toBe('gpt-4o');
      expect(result.data.OPENAI_MODEL_FAST).toBe('gpt-4o-mini');
      expect(result.data.EMBEDDING_DIMENSIONS).toBe(1536);
      expect(result.data.MAX_CONTEXT_TOKENS).toBe(12000);
      expect(result.data.MAX_AGENT_STEPS).toBe(6);
      expect(result.data.RAG_MIN_CONFIDENCE).toBe(0.55);
      expect(result.data.CRON_SECRET.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('defaults DEMO_MODE to true, since this is a hackathon build', () => {
    const result = envSchema.safeParse(MINIMAL_ENV);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DEMO_MODE).toBe(true);
    }
  });

  it('parses boolean-ish strings into real booleans', () => {
    const result = envSchema.safeParse({ ...MINIMAL_ENV, DEMO_MODE: 'false' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DEMO_MODE).toBe(false);
    }
  });

  it('coerces numeric strings, since process.env values are always strings', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      EMBEDDING_DIMENSIONS: '3072',
      MAX_AGENT_STEPS: '4',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.EMBEDDING_DIMENSIONS).toBe(3072);
      expect(result.data.MAX_AGENT_STEPS).toBe(4);
    }
  });
});

describe('envSchema — validation strictness', () => {
  it('rejects a host:port string with no protocol', () => {
    // WHATWG URL parsing accepts this as protocol "localhost:", so a bare
    // z.string().url() would let it through and produce broken absolute links.
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      NEXT_PUBLIC_APP_URL: 'localhost:3000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a database URL that is not a postgres URL', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a Redis URL that is not a redis URL', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      REDIS_URL: 'http://localhost:6379',
    });
    expect(result.success).toBe(false);
  });

  it('accepts the TLS variants of the postgres and redis protocols', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      DATABASE_URL: 'postgres://user:pass@db.example.com:5432/postgres',
      REDIS_URL: 'rediss://default:pass@redis.example.com:6380',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a CRON_SECRET shorter than 32 characters', () => {
    const result = envSchema.safeParse({ ...MINIMAL_ENV, CRON_SECRET: 'too-short' });
    expect(result.success).toBe(false);
  });

  it('rejects a semantic cache threshold below the documented floor of 0.92', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      SEMANTIC_CACHE_THRESHOLD: '0.5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a Supabase anon key that is implausibly short', () => {
    const result = envSchema.safeParse({
      ...MINIMAL_ENV,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'short',
    });
    expect(result.success).toBe(false);
  });
});
