/**
 * Bulk KB ingestion (MASTER_BUILD_SPEC.md §23.5 backend task 10).
 *
 * Reads every `.md` file in `supabase/seed/kb-articles/`, parses its simple
 * front-matter (`title`/`category`/`tags`/`visibility`), inserts a
 * `kb_documents` row, and runs the ingestion pipeline directly (not via the
 * job queue — this is a one-shot operator script, not a request path).
 *
 * Requires a live Supabase project. Refuses to run otherwise, same as
 * `scripts/reset-db.ts`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '@/lib/db/admin';
import { insertKbDocument } from '@/lib/db/queries/kb.query';
import { ingestDocument } from '@/lib/rag/ingestion';
import { isConfigured } from '@/config/env';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface ParsedArticle {
  title: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'internal' | 'restricted';
  body: string;
}

function parseFrontMatter(raw: string, fallbackTitle: string): ParsedArticle {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) {
    return {
      title: fallbackTitle,
      category: 'Uncategorised',
      tags: [],
      visibility: 'internal',
      body: raw,
    };
  }

  const [, frontMatter, body] = match;
  const fields: Record<string, string> = {};
  for (const line of frontMatter!.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  const visibility = fields['visibility'];
  return {
    title: fields['title'] ?? fallbackTitle,
    category: fields['category'] ?? 'Uncategorised',
    tags: fields['tags']
      ? fields['tags']
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    visibility:
      visibility === 'public' || visibility === 'restricted' ? visibility : 'internal',
    body: body!.trim(),
  };
}

async function main(): Promise<void> {
  if (!isConfigured.supabase) {
    console.error(
      'Supabase is not configured. This script requires NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY — see docs/DATABASE.md.',
    );
    process.exit(1);
  }

  const seedDir = resolve(process.cwd(), 'supabase', 'seed', 'kb-articles');
  const files = readdirSync(seedDir).filter((f) => f.endsWith('.md'));
  const admin = createAdminClient();

  console.log(`▸ Ingesting ${files.length} seed articles...`);

  for (const file of files) {
    const raw = readFileSync(resolve(seedDir, file), 'utf8');
    const article = parseFrontMatter(raw, file.replace(/\.md$/, ''));

    const document = await insertKbDocument(admin, {
      org_id: DEFAULT_ORG_ID,
      title: article.title,
      category: article.category,
      tags: article.tags,
      visibility: article.visibility,
      status: 'uploaded',
      filename: file,
      mime_type: 'text/markdown',
      raw_content: article.body,
    });

    try {
      const result = await ingestDocument(admin, document.id);
      console.log(`  ✓ ${article.title} (${result.chunkCount} chunks)`);
    } catch (error) {
      console.error(
        `  ✗ ${article.title}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
