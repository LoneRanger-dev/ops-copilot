import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { isConfigured } from '@/config/env';
import { KB_ARTICLES } from '@/lib/rag/demo-kb';
import { createServerSupabaseClient } from '@/lib/db/client';
import { listKbDocuments } from '@/lib/db/queries/kb.query';
import { PageHeader } from '@/components/shared/page-header';
import { KbBrowseClient } from '@/components/features/knowledge/kb-browse-client';
import type { KbListItem } from '@/components/features/knowledge/kb-document-card';

export const dynamic = 'force-dynamic';

/**
 * Knowledge Base browse UI (MASTER_BUILD_SPEC.md §23.5, FR-KB-6). Lists real
 * `kb_documents` rows (RLS-scoped by the caller's own session, so
 * visibility filtering is enforced at the database, not just here) when
 * Supabase is configured; falls back to the in-memory demo dataset
 * otherwise — see `docs/decisions/0002-pgvector-over-dedicated.md` for why
 * a real deployment keeps this same dense+sparse retrieval surface once
 * Postgres/pgvector exist.
 */
export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');

  let items: KbListItem[];

  if (isConfigured.supabase) {
    const supabase = await createServerSupabaseClient();
    const docs = await listKbDocuments(supabase, user.orgId);
    items = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description ?? '',
      category: doc.category ?? 'Uncategorised',
      tags: doc.tags,
      restricted: doc.visibility === 'restricted',
      chunkCount: doc.chunk_count,
      status: doc.status,
    }));
  } else {
    items = KB_ARTICLES.filter((a) =>
      a.visibility === 'restricted' ? isStaff : true,
    ).map((a) => ({
      id: a.slug,
      title: a.title,
      description: a.summary,
      category: a.category,
      tags: a.tags,
      restricted: a.visibility === 'restricted',
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Knowledge Base"
        description="Search-grounded articles the AI Chat and floating assistant cite from."
      />
      <KbBrowseClient items={items} />
    </div>
  );
}
