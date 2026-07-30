-- MASTER_BUILD_SPEC.md §11.4 — 007: ServiceNow Cache
-- RLS co-located with each table (see 004_profiles.sql header note).

create table snow_incident_cache (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  sys_id            text not null,
  number            text not null,
  record_type       text not null default 'incident',
  short_description text not null,
  description       text,
  state             incident_state not null,
  priority          int check (priority between 1 and 5),
  urgency           int check (urgency between 1 and 3),
  impact            int check (impact between 1 and 3),
  category          text,
  subcategory       text,
  assignment_group  text,
  assigned_to       text,
  caller_id         text,
  caller_email      text,
  opened_at         timestamptz,
  resolved_at       timestamptz,
  closed_at         timestamptz,
  resolution_notes  text,
  work_notes        jsonb not null default '[]'::jsonb,
  sla_due_at        timestamptz,
  sla_breached      boolean not null default false,
  embedding         vector(1536),      -- for similar-incident search, FR-SNOW-10
  raw               jsonb not null,
  fetched_at        timestamptz not null default now(),
  unique (org_id, number)
);

create index idx_snow_number   on snow_incident_cache(org_id, number);
create index idx_snow_state    on snow_incident_cache(org_id, state);
create index idx_snow_caller   on snow_incident_cache(org_id, caller_email);
create index idx_snow_opened   on snow_incident_cache(org_id, opened_at desc);
create index idx_snow_fetched  on snow_incident_cache(fetched_at);
create index idx_snow_embedding on snow_incident_cache
  using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
create index idx_snow_desc_tsv on snow_incident_cache
  using gin(to_tsvector('english', short_description || ' ' || coalesce(description,'')));

alter table snow_incident_cache enable row level security;

-- SERVICENOW CACHE — end users see only their own tickets. [FR-SNOW-7]
create policy snow_read_own on snow_incident_cache for select
  using (
    org_id = auth_org()
    and caller_email = (select email from profiles where id = auth.uid())
  );
create policy snow_read_staff on snow_incident_cache for select
  using (org_id = auth_org() and is_staff());
