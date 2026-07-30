import Link from 'next/link';
import { PlusIcon, DatabaseIcon } from 'lucide-react';
import { requireRole } from '@/lib/auth/server';
import { isConfigured } from '@/config/env';
import { createServerSupabaseClient } from '@/lib/db/client';
import { listKbDocuments } from '@/lib/db/queries/kb.query';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { KbDocumentTable } from '@/components/features/knowledge/kb-document-table';
import { toRoute } from '@/lib/utils/routes';

export const dynamic = 'force-dynamic';

/** Admin KB management (MASTER_BUILD_SPEC.md §23.5 frontend task 6, FR-ADMIN-2). */
export default async function AdminKnowledgePage() {
  const user = await requireRole('admin');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Knowledge Base Management"
        description="Upload, reindex, and delete documents. Ingestion runs asynchronously through the job queue."
        actions={
          <Button asChild>
            <Link href={toRoute('/admin/knowledge/upload')}>
              <PlusIcon className="size-4" /> Upload document
            </Link>
          </Button>
        }
      />

      {isConfigured.supabase ? (
        <AdminKnowledgeTable orgId={user.orgId} />
      ) : (
        <EmptyState
          icon={DatabaseIcon}
          title="Supabase is not configured"
          description="Document upload and management require a live Supabase project. In demo mode, browse the seeded knowledge base at /knowledge instead."
        />
      )}
    </div>
  );
}

async function AdminKnowledgeTable({ orgId }: { orgId: string }) {
  const supabase = await createServerSupabaseClient();
  const documents = await listKbDocuments(supabase, orgId);
  return <KbDocumentTable documents={documents} />;
}
