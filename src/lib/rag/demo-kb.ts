/**
 * In-memory knowledge base dataset (demo/hackathon scope).
 *
 * Stands in for the pgvector-backed KB pipeline in MASTER_BUILD_SPEC.md §5 —
 * that requires Postgres + embeddings, neither of which exist in this
 * demo-mode deployment (see docs/IMPLEMENTATION_OVERRIDE.md). This dataset
 * is deliberately structured so a later real ingestion pipeline can replace
 * it without changing any caller: `searchKb()` is the only entry point.
 */

export interface KbArticle {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly visibility: 'public' | 'internal' | 'restricted';
  readonly summary: string;
  readonly content: string;
  readonly updatedAt: string;
}

export const KB_ARTICLES: readonly KbArticle[] = [
  {
    id: 'kb-001',
    slug: 'vpn-connection-drops',
    title: 'VPN connection repeatedly drops on Windows clients',
    category: 'Network',
    tags: ['vpn', 'network', 'windows', 'connectivity'],
    visibility: 'public',
    summary:
      'Resolve intermittent VPN disconnects caused by idle-timeout and split-tunnel conflicts.',
    content:
      'Symptom: The corporate VPN client disconnects every 10-15 minutes, especially on Wi-Fi.\n\n' +
      'Root cause: The default idle-timeout policy (900s) combined with power-saving on the wireless ' +
      'adapter suspends the network interface, which the VPN client interprets as a dropped link.\n\n' +
      'Resolution:\n' +
      '1. Disable "Allow the computer to turn off this device to save power" on the Wi-Fi adapter ' +
      '(Device Manager > Network adapters > Properties > Power Management).\n' +
      '2. Set the VPN client keep-alive interval to 60s in Settings > Advanced.\n' +
      '3. If split tunnelling is enabled, confirm the internal DNS suffix is in the tunnelled route list.\n' +
      '4. Escalate to network engineering only if the drop persists on a wired connection.',
    updatedAt: '2026-06-12',
  },
  {
    id: 'kb-002',
    slug: 'password-reset-self-service',
    title: 'Self-service password reset is not sending the email',
    category: 'Identity',
    tags: ['password', 'sso', 'email', 'account'],
    visibility: 'public',
    summary:
      'Common causes for a missing password-reset email and how to unblock the user.',
    content:
      'Symptom: User requests a password reset from the login page and no email arrives within 5 minutes.\n\n' +
      'Checklist:\n' +
      '1. Confirm the account is Active in the directory — disabled accounts silently drop the email.\n' +
      '2. Check the spam/quarantine folder; the reset sender domain is frequently new-listed by corporate filters.\n' +
      '3. Verify the account is not federated to SSO only — federated accounts must reset at the identity ' +
      'provider, not the local portal.\n' +
      '4. If none of the above resolve it, manually trigger a reset from the admin console and confirm the ' +
      'mail queue depth is not backed up.',
    updatedAt: '2026-05-30',
  },
  {
    id: 'kb-003',
    slug: 'disk-space-critical-alert',
    title: 'Responding to a "disk space critical" alert on an application server',
    category: 'Infrastructure',
    tags: ['disk', 'storage', 'alert', 'server'],
    visibility: 'internal',
    summary:
      'Triage steps when free disk space drops below 10% on a production application host.',
    content:
      'Symptom: Monitoring fires a critical alert when free disk space on / or /var drops below 10%.\n\n' +
      'Immediate triage:\n' +
      '1. Identify the largest consumers: `du -xh --max-depth=1 /var | sort -rh | head -20`.\n' +
      '2. The two most common offenders are application logs without rotation and Docker/container image ' +
      'layers left by failed builds.\n' +
      '3. Rotate or compress logs older than 7 days; never delete the active log file a process still has open.\n' +
      '4. Clear unused container images: `docker system prune -af --filter "until=72h"`.\n' +
      '5. If space frees below threshold and the trend keeps climbing, open a change request to expand the volume ' +
      'rather than repeating this cleanup weekly.',
    updatedAt: '2026-07-02',
  },
  {
    id: 'kb-004',
    slug: 'deployment-pipeline-failing-health-check',
    title: 'Deployment pipeline fails at the post-deploy health check',
    category: 'Deployments',
    tags: ['deployment', 'ci/cd', 'health check', 'rollback'],
    visibility: 'internal',
    summary:
      'Diagnose a failing post-deploy smoke test and decide between fix-forward and rollback.',
    content:
      'Symptom: The pipeline deploys successfully but the automated post-deploy health check fails and the ' +
      'release is held in a "pending rollback" state.\n\n' +
      'Diagnosis order:\n' +
      '1. Check the health check response body, not just the status code — a 200 with an empty dependency ' +
      'report usually means a downstream service (DB migration, cache warm) has not finished.\n' +
      '2. Confirm the database migration step completed before the health check ran; a race between the two ' +
      'is the most common cause of this failure class.\n' +
      '3. If the failure is isolated to one pod/instance, it is very likely a stale image or cold cache — retry ' +
      'the health check once before escalating.\n' +
      '4. Roll back immediately if the health check fails on more than one instance or the error references a ' +
      'schema mismatch.',
    updatedAt: '2026-07-18',
  },
  {
    id: 'kb-005',
    slug: 'error-code-e4471',
    title: 'What does error code E-4471 mean?',
    category: 'Application Errors',
    tags: ['error code', 'e-4471', 'application'],
    visibility: 'public',
    summary:
      'E-4471 indicates an expired authentication token was presented to a downstream API.',
    content:
      'E-4471 is raised by the internal API gateway when a request carries an authentication token that has ' +
      'already expired at the time it reaches the gateway (as opposed to expiring in transit). It is most ' +
      'commonly seen after a client has been idle for longer than the access-token lifetime (1 hour) without ' +
      'triggering a silent refresh.\n\n' +
      'Fix: Have the user sign out and back in. If the error recurs within minutes of signing in, the client ' +
      'clock is likely skewed by more than 5 minutes from the server — check NTP sync on the client device.',
    updatedAt: '2026-04-21',
  },
  {
    id: 'kb-006',
    slug: 'outage-communication-runbook',
    title: 'Production outage communication runbook',
    category: 'Incident Management',
    tags: ['outage', 'incident', 'runbook', 'communication'],
    visibility: 'restricted',
    summary: 'Who to notify and in what order during a Sev-1 production outage.',
    content:
      'During a confirmed Sev-1 outage:\n' +
      '1. Declare the incident in the incident channel within 5 minutes of confirmation.\n' +
      '2. Page the on-call engineer for the affected service and the on-call incident commander.\n' +
      '3. Post a first customer-facing status update within 15 minutes, even if root cause is unknown — ' +
      'state impact and next update time, never speculate on cause publicly.\n' +
      '4. Update the status page every 30 minutes until resolved.\n' +
      '5. After resolution, schedule a blameless post-incident review within 3 business days.',
    updatedAt: '2026-03-11',
  },
];

function score(article: KbArticle, queryTerms: readonly string[]): number {
  const haystack =
    `${article.title} ${article.summary} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
  let total = 0;
  for (const term of queryTerms) {
    if (!term) continue;
    const occurrences = haystack.split(term).length - 1;
    total += occurrences * (article.title.toLowerCase().includes(term) ? 3 : 1);
  }
  return total;
}

/**
 * Keyword-ranked KB search. Stands in for the hybrid dense+sparse retrieval
 * pipeline in MASTER_BUILD_SPEC.md §6 — no embeddings or Postgres available
 * in this demo-mode deployment. Same signature a real implementation would
 * expose, so the caller (assistant route) never changes.
 */
export function searchKb(query: string, limit = 3): KbArticle[] {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  return KB_ARTICLES.map((article) => ({ article, s: score(article, terms) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.article);
}

export function getKbArticleBySlug(slug: string): KbArticle | undefined {
  return KB_ARTICLES.find((a) => a.slug === slug);
}
