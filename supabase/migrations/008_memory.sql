-- MASTER_BUILD_SPEC.md §11.4 — 008: Memory
-- RLS co-located with each table (see 004_profiles.sql header note).

create table conversation_summaries (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  summary         text not null,
  key_facts       jsonb not null default '[]'::jsonb,
  entities        jsonb not null default '{}'::jsonb,  -- {incidents:[],services:[],errors:[]}
  covers_up_to_message_id uuid references messages(id) on delete set null,
  message_count   int not null,
  token_count     int not null,
  created_at      timestamptz not null default now()
);

create index idx_convsum_conv on conversation_summaries(conversation_id, created_at desc);

-- Durable cross-session facts about a user and their environment. [A: A-40]
create table user_memory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  fact        text not null,
  category    text not null,          -- 'environment' | 'preference' | 'expertise' | 'context'
  confidence  numeric(3,2) not null default 0.8,
  embedding   vector(1536),
  source_conversation_id uuid references conversations(id) on delete set null,
  reinforced_count int not null default 1,
  last_used_at timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index idx_usermem_user on user_memory(user_id, category);
create index idx_usermem_emb  on user_memory using hnsw (embedding vector_cosine_ops);
create index idx_usermem_exp  on user_memory(expires_at) where expires_at is not null;

alter table conversation_summaries enable row level security;
alter table user_memory            enable row level security;

create policy convsum_own on conversation_summaries for all
  using (exists (select 1 from conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from conversations c
                 where c.id = conversation_id and c.user_id = auth.uid()));

create policy usermem_own on user_memory for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
