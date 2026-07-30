---
title: Deployment pipeline fails at the post-deploy health check
category: Deployments
tags: deployment, ci/cd, health check, rollback
visibility: internal
---

# Deployment Health Check Failures

## Symptom

The pipeline deploys successfully but the automated post-deploy health check
fails and the release is held in a "pending rollback" state.

## Diagnosis Order

1. Check the health check response body, not just the status code — a 200
   with an empty dependency report usually means a downstream service (DB
   migration, cache warm) has not finished.
2. Confirm the database migration step completed before the health check
   ran; a race between the two is the most common cause of this failure
   class.
3. If the failure is isolated to one pod/instance, it is very likely a stale
   image or cold cache — retry the health check once before escalating.
4. Roll back immediately if the health check fails on more than one instance
   or the error references a schema mismatch.
