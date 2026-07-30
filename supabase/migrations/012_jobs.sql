-- MASTER_BUILD_SPEC.md §11.4 — 012: Job Queue
-- RLS co-located with each table (see 004_profiles.sql header note).

create table job_queue (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  job_type     job_type not null,
  payload      jsonb not null,
  status       job_status not null default 'pending',
  priority     int not null default 5,
  attempts     int not null default 0,
  max_attempts int not null default 5,
  run_after    timestamptz not null default now(),
  locked_at    timestamptz,
  locked_by    text,
  last_error   text,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_job_poll on job_queue(status, run_after, priority)
  where status in ('pending','failed');
create index idx_job_type on job_queue(job_type, status);

alter table job_queue enable row level security;

-- JOB QUEUE — service role only. No policy grants access to authenticated users,
-- which means the table is invisible to them, except admins who may inspect it.
create policy job_admin on job_queue for select
  using (org_id = auth_org() and is_admin());
