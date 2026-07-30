import { NotFoundError } from '@/lib/api/errors';
import { createHandler } from '@/lib/api/handler';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { getKbDocument } from '@/lib/db/queries/kb.query';
import { enqueue } from '@/lib/jobs/queue';

/**
 * `POST /api/v1/kb/documents/[id]/reindex` — admin only (MASTER_BUILD_SPEC.md
 * §23.5 backend task 9, FR-KB-2). Enqueues `document.reindex`; the handler
 * (`lib/jobs/handlers/document-reindex.handler.ts`) deletes and re-inserts
 * chunks so reindexing never duplicates them.
 */
export const POST = createHandler<{ id: string }>(
  { requireMinRole: 'admin' },
  async ({ params, user }) => {
    const supabase = await createRouteHandlerSupabaseClient();
    const document = await getKbDocument(supabase, params.id);
    if (!document || document.deleted_at) throw new NotFoundError('Document not found.');

    await enqueue(supabase, user.orgId, 'document.reindex', { documentId: document.id });
    return { enqueued: true };
  },
);
