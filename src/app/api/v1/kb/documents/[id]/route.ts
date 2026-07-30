import { NotFoundError } from '@/lib/api/errors';
import { createHandler } from '@/lib/api/handler';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { deleteKbDocument, getKbDocument } from '@/lib/db/queries/kb.query';

/**
 * `GET`/`DELETE /api/v1/kb/documents/[id]` (MASTER_BUILD_SPEC.md §23.5
 * backend task 9, FR-KB-8). Delete is a hard delete: `kb_document_versions`
 * and `kb_chunks` cascade via their foreign keys, satisfying "deletion
 * cascades to chunks" without a separate application-level fan-out delete.
 */

export const GET = createHandler<{ id: string }>({}, async ({ params }) => {
  const supabase = await createRouteHandlerSupabaseClient();
  const document = await getKbDocument(supabase, params.id);
  if (!document || document.deleted_at) throw new NotFoundError('Document not found.');
  return { document };
});

export const DELETE = createHandler<{ id: string }>(
  { requireMinRole: 'admin' },
  async ({ params }) => {
    const supabase = await createRouteHandlerSupabaseClient();
    const document = await getKbDocument(supabase, params.id);
    if (!document) throw new NotFoundError('Document not found.');

    await deleteKbDocument(supabase, params.id);
    return { deleted: true };
  },
);
