import { createAdminClient } from '@/lib/db/admin';
import { ingestDocument } from '@/lib/rag/ingestion';

/**
 * `document.ingest` job handler (MASTER_BUILD_SPEC.md §23.5 backend task 8).
 * Registered with the worker in `lib/jobs/worker.ts`. Constructs its own
 * admin client — `lib/jobs/handlers/*` is one of the four permitted
 * service-role call sites (§16.6, `eslint.config.mjs`).
 */
export async function handleDocumentIngest(
  payload: Record<string, unknown>,
): Promise<void> {
  const documentId = payload['documentId'];
  if (typeof documentId !== 'string') {
    throw new Error('document.ingest payload missing string "documentId"');
  }

  await ingestDocument(createAdminClient(), documentId);
}
