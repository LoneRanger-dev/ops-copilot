import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { hasRoleAtLeast } from '@/lib/auth/rbac';
import { KB_ARTICLES } from '@/lib/rag/demo-kb';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toRoute } from '@/lib/utils/routes';

export const dynamic = 'force-dynamic';

/**
 * Knowledge Base browse UI (MASTER_BUILD_SPEC.md §23.5, FR-KB-6). Reads the
 * in-memory demo dataset directly — see `docs/decisions/0002-pgvector-over-
 * dedicated.md` for why a real deployment would still keep this same
 * dense+sparse retrieval surface once Postgres/pgvector exist.
 */
export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const isStaff = hasRoleAtLeast(user.role, 'support_engineer');

  const visible = KB_ARTICLES.filter((a) =>
    a.visibility === 'restricted' ? isStaff : true,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Knowledge Base"
        description="Search-grounded articles the AI Chat and floating assistant cite from."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((article) => (
          <Link key={article.id} href={toRoute(`/knowledge/${article.slug}`)}>
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline">{article.category}</Badge>
                  {article.visibility === 'restricted' && (
                    <Badge variant="secondary">Staff only</Badge>
                  )}
                </div>
                <CardTitle className="text-base">{article.title}</CardTitle>
                <CardDescription>{article.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
