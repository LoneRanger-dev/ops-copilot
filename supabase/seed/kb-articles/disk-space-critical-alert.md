---
title: Responding to a "disk space critical" alert on an application server
category: Infrastructure
tags: disk, storage, alert, server
visibility: internal
---

# Disk Space Critical Runbook

## Symptom

Monitoring fires a critical alert when free disk space on `/` or `/var`
drops below 10%.

## Immediate Triage

1. Identify the largest consumers:

   ```bash
   du -xh --max-depth=1 /var | sort -rh | head -20
   ```

2. The two most common offenders are application logs without rotation and
   Docker/container image layers left by failed builds.
3. Rotate or compress logs older than 7 days; never delete the active log
   file a process still has open.
4. Clear unused container images:

   ```bash
   docker system prune -af --filter "until=72h"
   ```

5. If space frees below threshold and the trend keeps climbing, open a
   change request to expand the volume rather than repeating this cleanup
   weekly.
