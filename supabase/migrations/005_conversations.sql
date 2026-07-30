-- MASTER_BUILD_SPEC.md §11.4 — 005: Conversations, Messages, Attachments
-- RLS co-located with each table (see 004_profiles.sql header note).

create table conversations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  title        text not null default 'New conversation',
  status       conversation_status not null default 'active',
  surface      surface_type not null default 'chat',
  message_count int not null default 0,
  total_tokens  int not null default 0,
  total_cost_usd numeric(10,6) not null default 0,
  last_message_at timestamptz not null default now(),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index idx_conv_user    on conversations(user_id, last_message_at desc)
  where deleted_at is null;
create index idx_conv_org     on conversations(org_id, created_at desc);
create index idx_conv_status  on conversations(user_id, status) where deleted_at is null;

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid references profiles(id) on delete set null,
  role            message_role not null,
  content         text not null,
  parts           jsonb not null default '[]'::jsonb,  -- AI SDK UIMessage parts
  tool_calls      jsonb,
  model           text,
  prompt_tokens      int,
  completion_tokens  int,
  cost_usd        numeric(10,6),
  latency_ms      int,
  cache_hit       boolean not null default false,
  groundedness    numeric(3,2),      -- Validator score, null for user messages
  risk_level      risk_level,
  trace_id        uuid,
  created_at      timestamptz not null default now()
);

create index idx_msg_conv    on messages(conversation_id, created_at asc);
create index idx_msg_trace   on messages(trace_id) where trace_id is not null;
create index idx_msg_user    on messages(user_id, created_at desc);

create table attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references messages(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  filename    text not null,
  mime_type   text not null,
  size_bytes  bigint not null check (size_bytes <= 10485760),   -- 10 MB, FR-CHAT-7
  storage_path text not null,
  extracted_text text,
  created_at  timestamptz not null default now()
);

create index idx_attach_msg on attachments(message_id);

alter table conversations enable row level security;
alter table messages      enable row level security;
alter table attachments   enable row level security;

-- CONVERSATIONS — strictly private, even to admins.
create policy conv_own on conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and org_id = auth_org());

-- MESSAGES — inherit conversation ownership.
create policy msg_own on messages for all
  using (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (
    select 1 from conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()));

-- ATTACHMENTS
create policy attach_own on attachments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
