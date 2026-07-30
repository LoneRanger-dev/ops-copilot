---
title: Diagnosing slow database query performance
category: Infrastructure
tags: database, performance, postgres, query
visibility: internal
---

# Slow Query Diagnosis

## Symptom

An application feature that used to respond in under a second now takes
several seconds, and the trend has been gradual rather than sudden.

## Diagnosis

1. Capture the actual query plan:

   ```sql
   explain (analyze, buffers) select ...;
   ```

2. Look for a sequential scan where an index scan is expected — this is the
   most common regression cause after a schema migration drops or renames
   an index unintentionally.
3. Check table bloat and last `VACUUM`/`ANALYZE` time; stale statistics lead
   the planner to choose a bad plan even when the right index exists.
4. Confirm connection pool saturation is not the actual bottleneck —
   queries queuing for a connection look identical to slow queries from the
   application's point of view.

## Resolution

Rebuild the missing index concurrently in production
(`create index concurrently`), then re-run `ANALYZE` on the affected table.
