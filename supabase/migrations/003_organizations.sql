-- MASTER_BUILD_SPEC.md §11.4 — 003: Organizations (tenancy root)

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Single-tenant MVP: exactly one row, referenced by every other table. [A: A-26]
insert into organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default');

-- RLS is enabled here with no policy yet (fail-closed: nothing is readable
-- until 004_profiles.sql adds the auth_org() helper and the org_read policy,
-- which both depend on the profiles table created there).
alter table organizations enable row level security;
