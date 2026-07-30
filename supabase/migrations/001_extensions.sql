-- MASTER_BUILD_SPEC.md §11.4 — 001: Extensions
-- Applied once, at the root of the migration sequence.

create extension if not exists "vector"; -- pgvector: embeddings (Phase 4+)
create extension if not exists "pg_trgm"; -- trigram: fuzzy lexical match (Phase 6+)
create extension if not exists "pgcrypto"; -- gen_random_uuid()
create extension if not exists "pg_cron"; -- scheduled jobs (Phase 5+)
