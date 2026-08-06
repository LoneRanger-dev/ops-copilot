import { describe, expect, it, vi, beforeEach } from 'vitest';

const documents = new Map<
  string,
  { id: string; org_id: string; raw_content: string; visibility: string }
>();
const chunksInserted: unknown[] = [];
const statusUpdates: unknown[] = [];

vi.mock('@/lib/db/queries/kb.query', () => ({
  getKbDocument: vi.fn(async (_client: unknown, id: string) => documents.get(id) ?? null),
  insertKbChunks: vi.fn(async (_client: unknown, chunks: unknown[]) => {
    chunksInserted.push(...chunks);
    return chunks;
  }),
  updateKbDocumentStatus: vi.fn(async (_client: unknown, id: string, patch: unknown) => {
    statusUpdates.push({ id, ...(patch as object) });
  }),
  deleteKbChunksForDocument: vi.fn(async () => {
    chunksInserted.length = 0;
  }),
}));

vi.mock('@/lib/ai/llm/embeddings', () => ({
  embedBatch: vi.fn(async (texts: string[]) =>
    texts.map(() => Array.from({ length: 1536 }, () => 0.01)),
  ),
}));

const { ingestDocument } = await import('@/lib/rag/ingestion');
const { embedBatch } = await import('@/lib/ai/llm/embeddings');

/**
 * Ingestion pipeline integration test (MASTER_BUILD_SPEC.md §23.5 testing
 * task 4). OpenAI (`embedBatch`) and the database layer (`kb.query.ts`) are
 * both mocked — there is no live Supabase/Postgres in this environment (see
 * `docs/DATABASE.md`), so this test exercises the orchestration logic in
 * `ingestion.ts` itself: status transitions, chunk count, and failure
 * handling, exactly what the spec asks this suite to assert.
 */
describe('ingestDocument', () => {
  beforeEach(() => {
    documents.clear();
    chunksInserted.length = 0;
    statusUpdates.length = 0;
    vi.clearAllMocks();
  });

  it('chunks, embeds, stores, and marks the document indexed', async () => {
    documents.set('doc-1', {
      id: 'doc-1',
      org_id: 'org-1',
      visibility: 'internal',
      raw_content:
        '# VPN\n\n' + 'Troubleshooting steps for VPN connectivity issues. '.repeat(50),
    });

    const result = await ingestDocument({} as never, 'doc-1');

    expect(result.chunkCount).toBeGreaterThan(0);
    expect(chunksInserted).toHaveLength(result.chunkCount);
    expect(embedBatch).toHaveBeenCalled();

    const finalStatus = statusUpdates[statusUpdates.length - 1] as {
      status: string;
      chunkCount: number;
    };
    expect(finalStatus.status).toBe('indexed');
    expect(finalStatus.chunkCount).toBe(result.chunkCount);
  }, 20000);

  it('writes chunks with non-null 1536-dimension embeddings and a heading path', async () => {
    documents.set('doc-2', {
      id: 'doc-2',
      org_id: 'org-1',
      visibility: 'public',
      raw_content: '# Networking\n\n## VPN\n\n' + 'content sentence. '.repeat(30),
    });

    await ingestDocument({} as never, 'doc-2');

    for (const chunk of chunksInserted as {
      embedding: number[];
      heading_path: string[];
    }[]) {
      expect(chunk.embedding).toHaveLength(1536);
      expect(Array.isArray(chunk.heading_path)).toBe(true);
    }
  });

  it('transitions to processing before indexed', async () => {
    documents.set('doc-3', {
      id: 'doc-3',
      org_id: 'org-1',
      visibility: 'internal',
      raw_content: '# A\n\nSome content.',
    });
    await ingestDocument({} as never, 'doc-3');

    const statuses = (statusUpdates as { status: string }[]).map((s) => s.status);
    expect(statuses).toEqual(['processing', 'indexed']);
  });

  it('sets status=failed with a message when embedding fails mid-pipeline', async () => {
    documents.set('doc-4', {
      id: 'doc-4',
      org_id: 'org-1',
      visibility: 'internal',
      raw_content: '# A\n\nSome real content here.',
    });
    vi.mocked(embedBatch).mockRejectedValueOnce(new Error('OpenAI unavailable'));

    await expect(ingestDocument({} as never, 'doc-4')).rejects.toThrow(
      'OpenAI unavailable',
    );

    const last = statusUpdates[statusUpdates.length - 1] as {
      status: string;
      errorMessage: string;
    };
    expect(last.status).toBe('failed');
    expect(last.errorMessage).toContain('OpenAI unavailable');
  });

  it('throws for a document that does not exist', async () => {
    await expect(ingestDocument({} as never, 'missing-doc')).rejects.toThrow('not found');
  });

  it('fails cleanly when the document has no extractable content', async () => {
    documents.set('doc-empty', {
      id: 'doc-empty',
      org_id: 'org-1',
      visibility: 'internal',
      raw_content: '',
    });
    await expect(ingestDocument({} as never, 'doc-empty')).rejects.toThrow('zero chunks');

    const last = statusUpdates[statusUpdates.length - 1] as { status: string };
    expect(last.status).toBe('failed');
  });
});
