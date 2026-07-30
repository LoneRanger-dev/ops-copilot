# RAG Pipeline

MASTER_BUILD_SPEC.md §12 (RAG Architecture) and §23.5 (Phase 5). This
document covers chunking and ingestion — the substrate every later AI phase
(Phase 6 hybrid retrieval, Phase 7 agentic RAG) depends on.

## Status

The full pipeline is implemented and unit/integration tested with mocked
OpenAI and a mocked database layer (no live Supabase project in this
environment — see `docs/DATABASE.md`). `npm run ingest:kb` seeds the 10
articles in `supabase/seed/kb-articles/` the moment a project exists.

## Pipeline

```
Upload → Validate → Extract → Normalise → Chunk → Embed → Store → Index → Verify
```

| Stage     | Module                                                | Detail                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate  | `lib/utils/file.ts`                                   | Extension allow-list, 25 MB ceiling                                                                                                                                                                                                |
| Extract   | `lib/rag/extraction.ts`                               | Magic-byte MIME verification via `file-type`, then dispatch: `.pdf` → `pdf-parse`, `.docx` → `mammoth` (`convertToMarkdown`, not `extractRawText` — raw text loses heading structure), `.html` → `turndown`, `.md`/`.txt` → direct |
| Normalise | `lib/rag/normalisation.ts`                            | NFC, strip control chars, collapse blank lines, preserve headings                                                                                                                                                                  |
| Chunk     | `lib/rag/chunking.ts`                                 | See below                                                                                                                                                                                                                          |
| Embed     | `lib/ai/llm/embeddings.ts`                            | Cache-first, batched 100/call, retried with backoff                                                                                                                                                                                |
| Store     | `lib/rag/ingestion.ts` + `lib/db/queries/kb.query.ts` | Chunks inserted with embedding, `heading_path`, `chunk_index`, `token_count`                                                                                                                                                       |
| Index     | Postgres                                              | `content_tsv` generated column; HNSW updates incrementally                                                                                                                                                                         |
| Verify    | `lib/rag/ingestion.ts`                                | `chunk_count > 0` and every chunk has a non-null embedding, else `status = 'failed'`                                                                                                                                               |

Extraction happens **synchronously in the upload route**
(`app/api/v1/kb/documents/route.ts`), not in the async job — there is no
Supabase Storage bucket wired up in this environment (§23.5 database task 1
is a documented gap), so there is no file to re-read from storage later. The
extracted, normalised text is written to `kb_documents.raw_content`
immediately, and the `document.ingest` job (chunk → embed → store → verify)
runs from that column.

## Chunking strategy (§12.3)

The highest-leverage file in this phase (`lib/rag/chunking.ts`):

1. Split on markdown headings first (`#` → `######`), tracking the full
   heading path.
2. A section exceeding `targetTokens` (800) is split on progressively finer
   boundaries — paragraphs, then `\n`, then `. `, then hard-wrapped — via
   `segmentIntoUnits()` + `packUnits()` + `splitLongText()`.
3. A section under `minTokens` (200) merges with the next sibling under the
   same parent heading (`mergeSmallSections()`).
4. 120-token overlap is applied between adjacent pieces split from the same
   section (`applyOverlap()`, using `takeTrailingTokens()` for exact
   token-level trimming rather than a character estimate).
5. **The heading path is prepended before embedding, never stored in
   `content`.** `buildEmbeddingInput()` produces
   `"Networking > VPN > Troubleshooting\n\n<content>"` — the `content`
   column itself stays clean for the article reader UI.
6. A fenced code block is never split, even if it exceeds every budget —
   `segmentIntoUnits()` treats a fence as one atomic unit that `packUnits()`
   is allowed to overflow `maxTokens` for.

`CHUNK_CONFIG` (`src/config/rag.ts`) reads `targetTokens`/`overlapTokens`
from `CHUNK_SIZE_TOKENS`/`CHUNK_OVERLAP_TOKENS`; `minTokens`/`maxTokens` are
fixed per the spec's own literal example.

## Embedding cache (§12.8)

Content-addressed by `sha256(normalise(text))` (`lib/cache/embedding-cache.ts`),
so it is never stale — a text change means a new key, not an invalidation
problem. 30-day TTL. Every embedding call in the codebase goes through
`lib/ai/llm/embeddings.ts`'s `embed()`/`embedBatch()` — no call bypasses the
cache (DoD).

Redis (`lib/cache/redis.ts`) degrades gracefully: unreachable or
unconfigured, every cache operation returns `null` rather than throwing
(`REDIS_FAIL_OPEN=true`, the default). Ingestion is slower without a cache,
never broken by its absence.

## Known gaps (disclosed, not hidden)

- **No Supabase Storage bucket.** §23.5 database task 1 calls for a
  `kb-documents` bucket with admin-write/authenticated-read. Not configured
  in this environment; `kb_documents.storage_path` is left null and
  extraction runs synchronously at upload time instead (see above).
- **`ingestion.test.ts` mocks the database layer**, not just OpenAI, because
  no live Postgres exists to test against — `kb.query.ts`'s functions are
  mocked with `vi.mock`, and the test asserts `ingestion.ts`'s own
  orchestration logic (status transitions, chunk count, failure handling).
- **`chunkDocument()`'s merge/split ordering is a judgement call** where the
  spec's prose is ambiguous: merging a tiny section into its "next sibling"
  keeps the _later, more specific_ heading path on the merged chunk, since
  it represents more of the merged content.
