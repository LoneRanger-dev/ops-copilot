-- MASTER_BUILD_SPEC.md §11.4 — 009: AI Traces
-- RLS co-located with each table (see 004_profiles.sql header note).

create table ai_traces (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  message_id      uuid references messages(id) on delete set null,
  user_id         uuid not null references profiles(id) on delete cascade,
  surface         surface_type not null,
  query           text not null,
  intent          text,
  complexity      text,
  plan            jsonb,
  route           jsonb,
  status          trace_status not null default 'running',
  groundedness    numeric(3,2),
  risk_level      risk_level,
  step_count      int not null default 0,
  retrieval_count int not null default 0,
  tool_call_count int not null default 0,
  cache_hit       boolean not null default false,
  total_prompt_tokens     int not null default 0,
  total_completion_tokens int not null default 0,
  total_cost_usd  numeric(10,6) not null default 0,
  duration_ms     int,
  error           jsonb,
  created_at      timestamptz not null default now()
);

create index idx_trace_conv   on ai_traces(conversation_id, created_at desc);
create index idx_trace_user   on ai_traces(user_id, created_at desc);
create index idx_trace_status on ai_traces(status, created_at desc);
create index idx_trace_org    on ai_traces(org_id, created_at desc);

create table ai_trace_steps (
  id          uuid primary key default gen_random_uuid(),
  trace_id    uuid not null references ai_traces(id) on delete cascade,
  step_index  int not null,
  agent_name  text not null,
  step_type   text not null,      -- 'plan'|'route'|'retrieve'|'tool'|'analyze'|'validate'|'synthesize'
  input       jsonb,              -- PII-redacted before write
  output      jsonb,
  model       text,
  prompt_tokens     int,
  completion_tokens int,
  cost_usd    numeric(10,6),
  duration_ms int,
  cache_hit   boolean not null default false,
  status      text not null,
  error       jsonb,
  created_at  timestamptz not null default now(),
  unique (trace_id, step_index)
);

create index idx_step_trace on ai_trace_steps(trace_id, step_index);
create index idx_step_agent on ai_trace_steps(agent_name, created_at desc);

alter table ai_traces      enable row level security;
alter table ai_trace_steps enable row level security;

-- TRACES — own traces readable; admins see all.
create policy trace_own on ai_traces for select using (user_id = auth.uid());
create policy trace_admin on ai_traces for select
  using (org_id = auth_org() and is_admin());
create policy step_own on ai_trace_steps for select
  using (exists (select 1 from ai_traces t
                 where t.id = trace_id and (t.user_id = auth.uid() or is_admin())));
