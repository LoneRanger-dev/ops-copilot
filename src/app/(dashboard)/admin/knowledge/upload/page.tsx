import { requireRole } from '@/lib/auth/server';
import { isConfigured } from '@/config/env';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { KbUploadForm } from '@/components/features/knowledge/kb-upload-form';
import { DatabaseIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

/** Admin upload page (MASTER_BUILD_SPEC.md §23.5 files to create). */
export default async function AdminKnowledgeUploadPage() {
  await requireRole('admin');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Upload document"
        description="Supported: Markdown, plain text, PDF, DOCX, HTML."
      />

      {isConfigured.supabase ? (
        <KbUploadForm />
      ) : (
        <EmptyState
          icon={DatabaseIcon}
          title="Supabase is not configured"
          description="Document upload requires a live Supabase project — see docs/DATABASE.md."
        />
      )}
    </div>
  );
}
