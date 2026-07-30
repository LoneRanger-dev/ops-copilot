import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { chunkDocument, buildEmbeddingInput } from './chunking';
import { normaliseText } from './normalisation';
import { embedBatch } from '@/lib/ai/llm/embeddings';
import {
  getKbDocument,
  insertKbChunks,
  updateKbDocumentStatus,
  deleteKbChunksForDocument,
} from '@/lib/db/queries/kb.query';
import { logger } from '@/lib/observability/logger';

/**
 * Ingestion orchestration (MASTER_BUILD_SPEC.md §12.2, §23.5 backend task 7):
 * extract → normalise → chunk → embed → store → verify, with status written
 * to `kb_documents` at each step.
 *
 * Extraction happens synchronously in the upload route
 * (`app/api/v1/kb/documents/route.ts`), which writes the result into
 * `kb_documents.raw_content` before enqueueing the job this function
 * processes — there is no Supabase Storage bucket wired up in this
 * environment (§23.5 database task 1 is a known gap, documented in
 * `docs/RAG.md`), so extraction cannot be deferred to a later stage that
 * would need to re-read the original file bytes from storage.
 */

export interface IngestionResult {
  readonly documentId: string;
  readonly chunkCount: number;
}

export async function ingestDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
): Promise<IngestionResult> {
  const document = await getKbDocument(supabase, documentId);
  if (!document) throw new Error(`kb_documents row ${documentId} not found`);

  await updateKbDocumentStatus(supabase, documentId, { status: 'processing' });

  try {
    const rawContent = document.raw_content ?? '';
    const normalised = normaliseText(rawContent);
    const chunks = chunkDocument(normalised);

    if (chunks.length === 0) {
      throw new Error('Document produced zero chunks after normalisation and chunking.');
    }

    const embeddingInputs = chunks.map((chunk) => buildEmbeddingInput(chunk));
    const vectors = await embedBatch(embeddingInputs);

    await deleteKbChunksForDocument(supabase, documentId); // idempotent: safe on first ingest too

    await insertKbChunks(
      supabase,
      chunks.map((chunk, index) => ({
        document_id: documentId,
        org_id: document.org_id,
        chunk_index: index,
        content: chunk.content,
        heading_path: [...chunk.headingPath],
        token_count: chunk.tokenCount,
        embedding: vectors[index] ?? null,
        visibility: document.visibility,
      })),
    );

    await updateKbDocumentStatus(supabase, documentId, {
      status: 'indexed',
      chunkCount: chunks.length,
      errorMessage: null,
      indexedAt: new Date().toISOString(),
    });

    logger.info({ documentId, chunkCount: chunks.length }, 'Document ingested');
    return { documentId, chunkCount: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ingestion failure';
    await updateKbDocumentStatus(supabase, documentId, {
      status: 'failed',
      errorMessage: message,
    });
    logger.error({ documentId, error: message }, 'Document ingestion failed');
    throw error;
  }
}

/** Re-embeds a document from its stored `raw_content`, replacing chunks without duplicating them. */
export async function reindexDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
): Promise<IngestionResult> {
  return ingestDocument(supabase, documentId); // `ingestDocument` already deletes-then-inserts
}
