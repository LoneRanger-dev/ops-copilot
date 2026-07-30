-- MASTER_BUILD_SPEC.md §11.4 — 013: Search Functions
--
-- The heart of hybrid retrieval. RRF is computed in Postgres, not in
-- TypeScript, so only the fused top-N crosses the network.

-- Dense retrieval only.
create or replace function match_kb_chunks(
  query_embedding vector(1536),
  match_count     int  default 20,
  filter_org_id   uuid default null,
  max_visibility  doc_visibility default 'internal'
)
returns table (
  chunk_id uuid, document_id uuid, content text,
  heading_path text[], similarity float, document_title text
)
language sql stable
as $$
  select c.id, c.document_id, c.content, c.heading_path,
         1 - (c.embedding <=> query_embedding) as similarity,
         d.title
  from kb_chunks c
  join kb_documents d on d.id = c.document_id
  where c.embedding is not null
    and d.deleted_at is null
    and d.status = 'indexed'
    and (filter_org_id is null or c.org_id = filter_org_id)
    and (
      c.visibility = 'public'
      or (max_visibility = 'internal'   and c.visibility in ('public','internal'))
      or (max_visibility = 'restricted' and c.visibility in ('public','internal','restricted'))
    )
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Hybrid: dense + sparse fused with Reciprocal Rank Fusion. [FR-RAG-4]
-- RRF score = sum over rankers of 1 / (k + rank). k=60 is the standard constant
-- from Cormack et al.; it damps the influence of top ranks just enough that a
-- document ranked well by both retrievers beats one ranked first by only one.
create or replace function hybrid_search_kb_chunks(
  query_embedding vector(1536),
  query_text      text,
  match_count     int   default 20,
  rrf_k           int   default 60,
  filter_org_id   uuid  default null,
  max_visibility  doc_visibility default 'internal'
)
returns table (
  chunk_id uuid, document_id uuid, content text, heading_path text[],
  document_title text, dense_rank int, sparse_rank int, rrf_score float
)
language sql stable
as $$
with visible as (
  select c.id, c.document_id, c.content, c.heading_path, c.embedding, c.content_tsv, d.title
  from kb_chunks c
  join kb_documents d on d.id = c.document_id
  where d.deleted_at is null
    and d.status = 'indexed'
    and (filter_org_id is null or c.org_id = filter_org_id)
    and (
      c.visibility = 'public'
      or (max_visibility = 'internal'   and c.visibility in ('public','internal'))
      or (max_visibility = 'restricted' and c.visibility in ('public','internal','restricted'))
    )
),
dense as (
  select id, row_number() over (order by embedding <=> query_embedding) as rnk
  from visible
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count * 3
),
sparse as (
  select id, row_number() over (
           order by ts_rank_cd(content_tsv, websearch_to_tsquery('english', query_text)) desc
         ) as rnk
  from visible
  where content_tsv @@ websearch_to_tsquery('english', query_text)
  order by ts_rank_cd(content_tsv, websearch_to_tsquery('english', query_text)) desc
  limit match_count * 3
)
select v.id, v.document_id, v.content, v.heading_path, v.title,
       d.rnk::int, s.rnk::int,
       coalesce(1.0 / (rrf_k + d.rnk), 0.0) + coalesce(1.0 / (rrf_k + s.rnk), 0.0)
from visible v
left join dense  d on d.id = v.id
left join sparse s on s.id = v.id
where d.rnk is not null or s.rnk is not null
order by 8 desc
limit match_count;
$$;

-- Similar historical incidents. [FR-SNOW-10]
create or replace function match_similar_incidents(
  query_embedding  vector(1536),
  exclude_number   text default null,
  match_count      int  default 5,
  filter_org_id    uuid default null
)
returns table (
  number text, short_description text, state incident_state,
  priority int, resolution_notes text, similarity float, resolved_at timestamptz
)
language sql stable
as $$
  select i.number, i.short_description, i.state, i.priority,
         i.resolution_notes, 1 - (i.embedding <=> query_embedding), i.resolved_at
  from snow_incident_cache i
  where i.embedding is not null
    and i.state in ('resolved','closed')          -- only learn from solved problems
    and (exclude_number is null or i.number <> exclude_number)
    and (filter_org_id is null or i.org_id = filter_org_id)
  order by i.embedding <=> query_embedding
  limit match_count;
$$;

-- Cross-session user memory recall.
create or replace function match_user_memory(
  query_embedding vector(1536),
  target_user_id  uuid,
  match_count     int default 5,
  min_similarity  float default 0.7
)
returns table (fact text, category text, confidence numeric, similarity float)
language sql stable
as $$
  select m.fact, m.category, m.confidence, 1 - (m.embedding <=> query_embedding)
  from user_memory m
  where m.user_id = target_user_id
    and m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
    and 1 - (m.embedding <=> query_embedding) >= min_similarity
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
