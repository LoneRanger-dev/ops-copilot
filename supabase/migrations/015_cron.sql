-- MASTER_BUILD_SPEC.md §11.4 — 015: Scheduled Jobs
--
-- Deviation from the spec's file sequence: this repository co-locates each
-- table's RLS policies with the migration that creates it (logged against
-- 004_profiles.sql and the Open Decisions Log) rather than deferring all
-- policies to a single 014_rls.sql. That file is intentionally absent —
-- numbering does not need to be contiguous for `supabase migration up`.
--
-- pg_cron requires the `app.base_url` and `app.cron_secret` GUCs to be set
-- (via `alter database ... set app.base_url = ...`) before these schedules
-- can fire for real; harmless to apply ahead of that configuration.

select cron.schedule('process-job-queue', '* * * * *', $$
  select net.http_post(
    url := current_setting('app.base_url') || '/api/v1/jobs/process',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret'))
  );
$$);

select cron.schedule('sync-servicenow', '*/5 * * * *', $$
  insert into job_queue (org_id, job_type, payload)
  values ('00000000-0000-0000-0000-000000000001', 'incident.sync', '{}'::jsonb);
$$);

select cron.schedule('rollup-analytics', '0 * * * *', $$
  insert into job_queue (org_id, job_type, payload)
  values ('00000000-0000-0000-0000-000000000001', 'analytics.rollup', '{}'::jsonb);
$$);

-- Retention: conversations 180 d, traces 90 d, audit 400 d. [A: A-41]
select cron.schedule('purge-retention', '0 3 * * *', $$
  insert into job_queue (org_id, job_type, payload)
  values ('00000000-0000-0000-0000-000000000001', 'retention.purge', '{}'::jsonb);
$$);
