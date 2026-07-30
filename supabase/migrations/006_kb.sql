-- MASTER_BUILD_SPEC.md §11.4 — 006: Knowledge Base
-- RLS co-located with each table (see 004_profiles.sql header note).

create table kb_documents (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  title         text not null,
  description   text,
  source_type   text not null default 'upload',
  source_url    text,
  filename      text,
  mime_type     text,
  size_bytes    bigint,
  storage_path  text,
  raw_content   text,
  category      text,
  tags          text[] not null default '{}',
  visibility    doc_visibility not null default 'internal',
  status        doc_status not null default 'uploaded',
  version       int not null default 1,
  supersedes_id uuid references kb_documents(id) on delete set null,
  chunk_count   int not null default 0,
  error_message text,
  indexed_at    timestamptz,
  uploaded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_kbdoc_org      on kb_documents(org_id, created_at desc) where deleted_at is null;
create index idx_kbdoc_status   on kb_documents(status) where deleted_at is null;
create index idx_kbdoc_category on kb_documents(org_id, category) where deleted_at is null;
create index idx_kbdoc_tags     on kb_documents using gin(tags);
create index idx_kbdoc_title_trgm on kb_documents using gin(title gin_trgm_ops);

create table kb_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references kb_documents(id) on delete cascade,
  version      int not null,
  raw_content  text not null,
  changed_by   uuid references profiles(id) on delete set null,
  change_note  text,
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

create table kb_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references kb_documents(id) on delete cascade,
  org_id        uuid not null references organizations(id) on delete cascade,
  chunk_index   int not null,
  content       text not null,
  heading_path  text[] not null default '{}',   -- ["Networking","VPN","Troubleshooting"]
  token_count   int not null,
  embedding     vector(1536),                   -- [A: A-35] text-embedding-3-small
  content_tsv   tsvector generated always as (to_tsvector('english', content)) stored,
  visibility    doc_visibility not null default 'internal',
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- Dense retrieval. HNSW chosen over IVFFlat: better recall at our scale,
-- and no need to rebuild after bulk inserts. [FR-RAG-2]
create index idx_chunks_embedding on kb_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Sparse retrieval. [FR-RAG-3]
create index idx_chunks_tsv on kb_chunks using gin(content_tsv);

create index idx_chunks_doc        on kb_chunks(document_id, chunk_index);
create index idx_chunks_visibility on kb_chunks(org_id, visibility);

alter table kb_documents         enable row level security;
alter table kb_document_versions enable row level security;
alter table kb_chunks            enable row level security;

-- KB DOCUMENTS — read gated by visibility × role; write is admin-only.
create policy kbdoc_read on kb_documents for select
  using (
    org_id = auth_org()
    and deleted_at is null
    and (
      visibility = 'public'
      or (visibility = 'internal'   and auth.uid() is not null)
      or (visibility = 'restricted' and is_staff())
    )
  );
create policy kbdoc_admin on kb_documents for all
  using (org_id = auth_org() and is_admin())
  with check (org_id = auth_org() and is_admin());

create policy kbver_read on kb_document_versions for select
  using (exists (select 1 from kb_documents d where d.id = document_id));
create policy kbver_admin on kb_document_versions for all
  using (is_admin()) with check (is_admin());

-- KB CHUNKS — the retrieval boundary. This policy is why FR-RAG-10 holds
-- even if application filtering is bypassed.
create policy kbchunk_read on kb_chunks for select
  using (
    org_id = auth_org()
    and (
      visibility = 'public'
      or (visibility = 'internal'   and auth.uid() is not null)
      or (visibility = 'restricted' and is_staff())
    )
    and exists (select 1 from kb_documents d
                where d.id = document_id and d.deleted_at is null and d.status = 'indexed')
  );
create policy kbchunk_admin on kb_chunks for all
  using (is_admin()) with check (is_admin());
