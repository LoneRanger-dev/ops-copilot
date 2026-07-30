import { createAdminClient } from '@/lib/db/admin';
import { reindexDocument } from '@/lib/rag/ingestion';

/**
 * `document.reindex` job handler (MASTER_BUILD_SPEC.md §23.5 backend task 8).
 * See `document-ingest.handler.ts` for the service-role call-site note.
 */
export async function handleDocumentReindex(
  payload: Record<string, unknown>,
): Promise<void> {
  const documentId = payload['documentId'];
  if (typeof documentId !== 'string') {
    throw new Error('document.reindex payload missing string "documentId"');
  }

  await reindexDocument(createAdminClient(), documentId);
}
