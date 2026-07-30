import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { getKbArticleBySlug } from '@/lib/rag/demo-kb';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toRoute } from '@/lib/utils/routes';

export const dynamic = 'force-dynamic';

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const article = getKbArticleBySlug(slug);

  if (!article) notFound();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');
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
