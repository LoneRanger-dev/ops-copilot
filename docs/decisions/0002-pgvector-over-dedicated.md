# ADR 0002 — pgvector inside Postgres over a dedicated vector store

- **Status:** Accepted
- **Date:** 2026-07-30
- **Phase:** 3 (recorded ahead of use; the vector index itself lands in Phase 4/6)
- **Specification:** MASTER_BUILD_SPEC.md section 11.1, assumption A-33

## Context

The knowledge base and hybrid RAG pipeline (sections 6, 9, 11) need a vector
store for embedding similarity search. The tech-stack discovery questionnaire
(`03_Tech_Stack_Discovery`, section 4) asked which vector database to use —
Pinecone, Weaviate, Qdrant, and a Postgres extension were all live options —
and left it unanswered. This specification chose `pgvector` inside the same
Postgres instance that already holds every other table (assumption A-33).

## Decision

Use the `pgvector` extension inside the single Supabase/Postgres database.
No separate vector database, no additional network hop, no second connection
pool to manage.

## Rationale

**One database, one transaction boundary.** A knowledge base write (insert a
document, its chunks, and their embeddings) and a retrieval read (hybrid
search joined against `kb_documents` for visibility) both stay inside a single
Postgres connection. A dedicated vector store would split this across two
systems with no shared transaction, and RLS-based visibility filtering
(FR-RAG-10, section 11.4 policy `kbchunk_read`) would have to be reimplemented
outside the database that actually enforces it everywhere else.

**Scale fits the stated ceiling.** Section 4.2 caps the KB at 10,000 documents
and 500,000 chunks for the MVP. An HNSW index (section 11.6) on `vector(1536)`
comfortably serves that volume inside the retrieval latency budget
(NFR-PERF-5, ≤400ms p95 for the full hybrid pass) without a purpose-built
vector engine.

**Hybrid retrieval is naturally one query.** FR-RAG-1 through FR-RAG-4 require
dense vector search _and_ sparse full-text search, fused with Reciprocal Rank
Fusion. Both live as native Postgres capabilities (`pgvector` cosine distance,
`tsvector`/`ts_rank_cd`), so the fusion step is one SQL statement rather than
a client-side merge of two independent systems' result sets.

**Zero additional infrastructure.** The hackathon portability override
(`docs/IMPLEMENTATION_OVERRIDE.md`) removes Docker and requires the app to run
from a single Supabase project (or demo mode with none at all). A dedicated
vector database would be a second service to provision, configure, and keep
in sync — directly working against that constraint.

## Consequences

**Positive**

- No embedding data ever leaves the RLS boundary that already governs every
  other row in the system.
- One migration sequence, one backup/PITR story, one connection pool.
- Hybrid search and RRF fusion are expressible as native SQL (section 11.4
  function `hybrid_search`), not application-layer glue code.

**Negative**

- pgvector's HNSW index is not as specialised as a purpose-built ANN engine;
  very large corpora (tens of millions of vectors) would eventually want a
  dedicated store. Out of scope at the stated 500,000-chunk ceiling.
- Vector index maintenance (rebuild after bulk loads) competes for the same
  Postgres resources as the rest of the application.

**Neutral**

- `EMBEDDING_DIMENSIONS` and `OPENAI_EMBEDDING_MODEL` are locked together
  (assumption A-35); changing either after Phase 5 requires re-embedding the
  corpus regardless of which vector store holds it.

## Alternatives considered

**Pinecone / Weaviate / Qdrant (managed or self-hosted).** Rejected for the
MVP: each adds a second network hop on the retrieval hot path (NFR-PERF-5),
a second credential to manage, and a second system that must independently
enforce the same role-based visibility RLS already provides for free inside
Postgres. Revisit if the corpus exceeds the stated ceiling on the production
roadmap (section 1.5).
