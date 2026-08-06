-- MASTER_BUILD_SPEC.md §12 (RAG Architecture) — additive migration, Phase 6.
--
-- `hybrid_search_kb_chunks` (013_functions.sql) already fuses dense + sparse
-- with RRF for a SINGLE query. The recursive retriever (§20.3) issues
-- multiple rewritten query variants per pass and fuses their results in
-- TypeScript (`lib/rag/fusion.ts`) — that requires dense and sparse result
-- sets independently, which this migration adds as a standalone sparse-only
-- function alongside the existing dense-only `match_kb_chunks`.

create or replace function match_kb_chunks_sparse(
  query_text     text,
  match_count    int  default 20,
  filter_org_id  uuid default null,
  max_visibility doc_visibility default 'internal'
)
returns table (
  chunk_id uuid, document_id uuid, content text,
  heading_path text[], rank float, document_title text
)
language sql stable
as $$
  select c.id, c.document_id, c.content, c.heading_path,
         ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', query_text)) as rank,
         d.title
  from kb_chunks c
  join kb_documents d on d.id = c.document_id
  where d.deleted_at is null
    and d.status = 'indexed'
    and c.content_tsv @@ websearch_to_tsquery('english', query_text)
    and (filter_org_id is null or c.org_id = filter_org_id)
    and (
      c.visibility = 'public'
      or (max_visibility = 'internal'   and c.visibility in ('public','internal'))
      or (max_visibility = 'restricted' and c.visibility in ('public','internal','restricted'))
    )
  order by ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', query_text)) desc
  limit match_count;
$$;
