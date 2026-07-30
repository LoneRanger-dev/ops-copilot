/**
 * Database reset (MASTER_BUILD_SPEC.md §23.4 database task 8).
 *
 * Drops the public schema and reapplies every migration under
 * `supabase/migrations/` in order, using a direct `pg` connection —
 * deliberately not the Supabase CLI, since a fresh clone may not have it
 * installed (docs/IMPLEMENTATION_OVERRIDE.md's portability contract).
 *
 * Refuses to run when `NODE_ENV=production`, per the spec's own acceptance
 * criterion — this script is destructive by design.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run scripts/reset-db.ts with NODE_ENV=production.');
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      'DATABASE_URL is not set. This script requires a real Postgres instance ' +
        '(local or hosted) with the pgvector extension available.',
    );
    process.exit(1);
  }

  const migrationsDir = resolve(process.cwd(), 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('▸ Dropping schema...');
    await client.query('drop schema if exists public cascade; create schema public;');

    console.log(`▸ Applying ${files.length} migrations...`);
    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
      try {
        await client.query(sql);
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.error(
          `  ✗ ${file} failed:`,
          error instanceof Error ? error.message : error,
        );
        throw error;
      }
    }

    console.log('▸ Verifying RLS is enabled on every table...');
    const { rows } = await client.query(
      `select relname from pg_class
       where relrowsecurity = false and relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    if (rows.length > 0) {
      throw new Error(
        `Tables without RLS enabled: ${rows.map((r) => r.relname).join(', ')}`,
      );
    }
    console.log('  ✓ all tables have RLS enabled');

    console.log('Database ready.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
