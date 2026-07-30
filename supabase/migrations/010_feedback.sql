-- MASTER_BUILD_SPEC.md §11.4 — 010: Feedback & Escalations
-- RLS co-located with each table (see 004_profiles.sql header note).

create table feedback (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  message_id  uuid not null references messages(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  rating      feedback_rating not null,
  reason      text,
  comment     text,
  categories  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (message_id, user_id)          -- one vote per user per message
);

create index idx_fb_msg    on feedback(message_id);
create index idx_fb_rating on feedback(org_id, rating, created_at desc);

create table escalations (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  incident_number text,
  reason        text not null,
  urgency       text not null,
  status        escalation_status not null default 'open',
  assigned_to   uuid references profiles(id) on delete set null,
  ai_summary    text,
  resolved_at   timestamptz,
  resolution_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_esc_status on escalations(org_id, status, created_at desc);
create index idx_esc_user   on escalations(user_id, created_at desc);

alter table feedback     enable row level security;
alter table escalations  enable row level security;

create policy fb_own on feedback for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fb_read_mgr on feedback for select
  using (org_id = auth_org() and auth_role() in ('manager','admin'));

create policy esc_own on escalations for select using (user_id = auth.uid());
create policy esc_insert_own on escalations for insert with check (user_id = auth.uid());
create policy esc_staff on escalations for all
  using (org_id = auth_org() and is_staff())
  with check (org_id = auth_org() and is_staff());
