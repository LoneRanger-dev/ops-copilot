/**
 * Pre-boot environment check.
 *
 * Run with `npm run check:env`. Loads `.env.local` (without overriding values
 * already present in the real environment, so CI secrets win), then validates
 * against the same schema the application uses at boot. Exits non-zero with an
 * actionable message so a misconfiguration is caught before `npm run dev`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env.local');
const EXAMPLE_FILE = resolve(process.cwd(), '.env.example');

function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    // Strip matching surrounding quotes, if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(path, 'utf8')))) {
    // Real environment variables take precedence over the file.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  if (!existsSync(ENV_FILE)) {
    console.error('Missing .env.local');
    console.error(
      existsSync(EXAMPLE_FILE)
        ? '  Fix: cp .env.example .env.local, then set OPENAI_API_KEY.'
        : '  Fix: create .env.local containing OPENAI_API_KEY=sk-...',
    );
    process.exit(1);
  }

  loadEnvFile(ENV_FILE);

  try {
    // Imported dynamically: the module validates at load, so it must not be
    // evaluated until after .env.local has been merged into process.env.
    const { env, isConfigured } = await import('../src/config/env');

    const host = (url: string | undefined): string => {
      if (!url) return 'not configured';
      try {
        return new URL(url).host;
      } catch {
        return url;
      }
    };

    console.log('Environment OK\n');
    console.log('  Application');
    console.log(`    NODE_ENV      ${env.NODE_ENV}`);
    console.log(`    APP_URL       ${env.NEXT_PUBLIC_APP_URL}`);
    console.log(`    LOG_LEVEL     ${env.LOG_LEVEL}`);
    console.log(`    DEMO_MODE     ${env.DEMO_MODE}`);
    console.log('\n  OpenAI');
    console.log(`    primary       ${env.OPENAI_MODEL_PRIMARY}`);
    console.log(`    fast          ${env.OPENAI_MODEL_FAST}`);
    console.log(
      `    embedding     ${env.OPENAI_EMBEDDING_MODEL} (${env.EMBEDDING_DIMENSIONS}d)`,
    );
    console.log('\n  Optional infrastructure');
    console.log(
      `    Supabase      ${isConfigured.supabase ? 'configured' : 'not configured (Phase 2)'}`,
    );
    console.log(
      `    Postgres      ${isConfigured.database ? host(env.DATABASE_URL) : 'not configured (Phase 4)'}`,
    );
    console.log(
      `    Redis         ${isConfigured.redis ? host(env.REDIS_URL) : 'not configured (Phase 6)'}`,
    );
    console.log('\nReady. Run: npm run dev');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
