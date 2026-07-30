import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { isConfigured } from '@/config/env';
import { getKbArticleBySlug } from '@/lib/rag/demo-kb';
import { createServerSupabaseClient } from '@/lib/db/client';
import { getKbDocument } from '@/lib/db/queries/kb.query';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KbArticleReader } from '@/components/features/knowledge/kb-article-reader';
import { KbTableOfContents } from '@/components/features/knowledge/kb-table-of-contents';
import { toRoute } from '@/lib/utils/routes';

export const dynamic = 'force-dynamic';

/**
 * Article reader (MASTER_BUILD_SPEC.md §23.5 frontend task 5). `documentId`
 * is a real `kb_documents.id` (UUID) when Supabase is configured, or a demo
 * slug from `lib/rag/demo-kb.ts` otherwise — one route serves both so the
 * spec's `[documentId]` path never has to fork into two URL shapes.
 */
export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const user = await requireUser();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');

  if (isConfigured.supabase) {
    const supabase = await createServerSupabaseClient();
    const doc = await getKbDocument(supabase, documentId);
    if (!doc || doc.deleted_at) notFound(); // RLS also enforces visibility on read

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-6">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link href={toRoute('/knowledge')}>
                <ArrowLeftIcon className="size-4" /> Back to knowledge base
              </Link>
            </Button>
            <PageHeader
              title={doc.title}
              description={`${doc.category ?? 'Uncategorised'} · ${doc.status} · ${doc.chunk_count} chunks`}
              actions={
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              }
            />
          </div>
          <article className="border-border bg-card rounded-lg border p-6">
            <KbArticleReader markdown={doc.raw_content ?? ''} />
          </article>
        </div>
        <KbTableOfContents markdown={doc.raw_content ?? ''} />
      </div>
    );
  }

  const article = getKbArticleBySlug(documentId);
  if (!article) notFound();
  if (article.visibility === 'restricted' && !isStaff) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={toRoute('/knowledge')}>
            <ArrowLeftIcon className="size-4" /> Back to knowledge base
          </Link>
        </Button>
        <PageHeader
          title={article.title}
          description={`${article.category} · Updated ${article.updatedAt}`}
          actions={
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          }
        />
      </div>

      <article className="border-border bg-card rounded-lg border p-6 text-sm leading-relaxed whitespace-pre-wrap">
        {article.content}
      </article>
    </div>
  );
}
