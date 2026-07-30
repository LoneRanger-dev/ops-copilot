-- MASTER_BUILD_SPEC.md §11.4 — 011: Audit & Feature Flags
-- RLS co-located with each table (see 004_profiles.sql header note).

-- Append-only. No UPDATE or DELETE policy exists for any role. [FR-ANLY-6]
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  actor_email text,
  action      text not null,        -- 'user.role_changed' | 'kb.document_deleted' | ...
  resource_type text not null,
  resource_id text,
  before      jsonb,
  after       jsonb,
  ip_address  inet,
  user_agent  text,
  request_id  text,
  created_at  timestamptz not null default now()
);

create index idx_audit_org    on audit_logs(org_id, created_at desc);
create index idx_audit_actor  on audit_logs(actor_id, created_at desc);
create index idx_audit_action on audit_logs(action, created_at desc);
create index idx_audit_res    on audit_logs(resource_type, resource_id);

create table feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text not null,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into feature_flags (key, enabled, description) values
  ('recursive_retrieval', true,  'Allow the Retriever to run follow-up retrieval passes'),
  ('semantic_cache',      true,  'Serve near-duplicate queries from the semantic cache'),
  ('root_cause_analysis', true,  'Enable the Root Cause Analyzer agent'),
  ('similar_incidents',   true,  'Enable similar-incident vector search'),
  ('file_upload',         true,  'Allow file attachments in the main chat'),
  ('servicenow_live',     false, 'Use the live ServiceNow instance instead of the mock server');

alter table audit_logs    enable row level security;
alter table feature_flags enable row level security;

-- AUDIT LOGS — read-only to admins, append-only to everyone.
-- Deliberately NO update or delete policy exists. Not for any role. Ever.
create policy audit_read_admin on audit_logs for select
  using (org_id = auth_org() and is_admin());
create policy audit_insert on audit_logs for insert
  with check (org_id = auth_org());

-- FEATURE FLAGS
create policy flag_read on feature_flags for select using (auth.uid() is not null);
create policy flag_admin on feature_flags for all
  using (is_admin()) with check (is_admin());
