-- MASTER_BUILD_SPEC.md §11.4 — 002: Enums
-- All enum types used across every phase, defined once so later migrations
-- never need an `alter type ... add value` (which cannot run in a transaction
-- alongside its own use).

create type user_role as enum ('end_user', 'support_engineer', 'manager', 'admin');
create type conversation_status as enum ('active', 'archived', 'deleted');
create type message_role as enum ('user', 'assistant', 'system', 'tool');
create type surface_type as enum ('chat', 'widget');
create type doc_status as enum ('uploaded','processing','indexed','failed','superseded');
create type doc_visibility as enum ('public','internal','restricted');
create type job_status as enum ('pending','processing','completed','failed','dead_letter');
create type job_type as enum (
  'document.ingest','document.reindex','incident.sync',
  'memory.summarise','analytics.rollup','retention.purge'
);
create type trace_status as enum ('running','completed','partial','failed','blocked');
create type risk_level as enum ('safe','caution','dangerous');
create type feedback_rating as enum ('positive','negative');
create type escalation_status as enum ('open','acknowledged','resolved','cancelled');
create type incident_state as enum ('new','in_progress','on_hold','resolved','closed','cancelled');
