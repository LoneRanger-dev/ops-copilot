-- MASTER_BUILD_SPEC.md §11.4 — 004: Profiles (users, roles, auth trigger)
--
-- RLS policies for both `organizations` and `profiles` are applied here, not
-- deferred to a later consolidated `014_rls.sql`. The helper functions below
-- (auth_org, is_staff, is_admin) query `profiles`, so they cannot exist before
-- this table does; keeping each table's policies with the migration that
-- makes them satisfiable avoids a real table ever running with RLS enabled
-- but zero policies for more than the width of this single migration. Logged
-- in MASTER_BUILD_SPEC.md §25 as an Open Decisions Log entry and in
-- docs/ARCHITECTURE.md. Later phases follow the same per-table pattern.

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  org_id        uuid not null references organizations(id) on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          user_role not null default 'end_user',
  department    text,
  job_title     text,
  is_active     boolean not null default true,
  mfa_enrolled  boolean not null default false,
  last_seen_at  timestamptz,
  preferences   jsonb not null default '{"theme":"system","density":"comfortable"}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_org      on profiles(org_id);
create index idx_profiles_role     on profiles(org_id, role);
create index idx_profiles_active   on profiles(org_id) where is_active;

-- Auto-provision a profile whenever Supabase Auth creates a user.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, org_id, email, full_name, role)
  values (
    new.id,
    '00000000-0000-0000-0000-000000000001',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'end_user'                      -- ALWAYS least privilege on creation
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Security note: the trigger hard-codes 'end_user'. Role elevation happens
-- only through the admin API, which writes an audit log. A self-registering
-- user MUST NEVER be able to choose their own role.

alter table profiles enable row level security;

-- Helper functions. SECURITY DEFINER + a locked search_path so they cannot be
-- subverted by a caller-controlled schema.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_org() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('support_engineer','manager','admin') from profiles where id = auth.uid()),
    false);
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

-- ORGANIZATIONS
create policy org_read on organizations for select
  using (id = auth_org());

-- PROFILES
create policy profile_read_own on profiles for select
  using (id = auth.uid());
create policy profile_read_staff on profiles for select
  using (org_id = auth_org() and is_staff());
create policy profile_update_own on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
  -- ↑ WITH CHECK pins role: a user updating their own profile cannot change their role.
create policy profile_admin_all on profiles for all
  using (org_id = auth_org() and is_admin())
  with check (org_id = auth_org() and is_admin());
