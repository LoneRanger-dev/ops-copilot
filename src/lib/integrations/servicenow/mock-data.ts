/**
 * Mock ServiceNow incident dataset (MASTER_BUILD_SPEC.md §23.8 — a local mock
 * server is required for development/demo, FR-SNOW-4). This in-memory
 * dataset stands in for the Table API + Postgres cache in this demo-mode
 * deployment; `searchIncidents` / `getIncidentByNumber` are the stable
 * surface a real integration would keep.
 */

export type IncidentState = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
export type IncidentPriority = 1 | 2 | 3 | 4 | 5;

export interface MockIncident {
  readonly number: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly state: IncidentState;
  readonly priority: IncidentPriority;
  readonly assignedTo: string;
  readonly assignmentGroup: string;
  readonly callerEmail: string;
  readonly openedAt: string;
  readonly updatedAt: string;
  readonly workNotes: readonly string[];
}

export const MOCK_INCIDENTS: readonly MockIncident[] = [
  {
    number: 'INC0010234',
    shortDescription: 'VPN disconnects every 10-15 minutes',
    description:
      'User reports the corporate VPN client repeatedly drops while working from home on Wi-Fi.',
    state: 'in_progress',
    priority: 3,
    assignedTo: 'Marcus Chen',
    assignmentGroup: 'Network Support',
    callerEmail: 'priya@opscopilot.demo',
    openedAt: '2026-07-28T09:14:00Z',
    updatedAt: '2026-07-29T15:02:00Z',
    workNotes: [
      'Confirmed idle-timeout policy is default 900s.',
      'Advised disabling adapter power saving; awaiting confirmation from user.',
    ],
  },
  {
    number: 'INC0010241',
    shortDescription: 'Password reset email not received',
    description:
      'User requested a password reset three times, no email arrived in inbox or spam.',
    state: 'resolved',
    priority: 4,
    assignedTo: 'Marcus Chen',
    assignmentGroup: 'Identity & Access',
    callerEmail: 'priya@opscopilot.demo',
    openedAt: '2026-07-25T11:40:00Z',
    updatedAt: '2026-07-25T12:10:00Z',
    workNotes: [
      'Account was federated to SSO only; local reset does not apply.',
      'Redirected user to SSO identity provider reset flow. Confirmed resolved.',
    ],
  },
  {
    number: 'INC0010256',
    shortDescription: 'Production app server disk space critical',
    description: 'Monitoring paged on-call: /var partition on app-prod-07 at 4% free.',
    state: 'in_progress',
    priority: 1,
    assignedTo: 'Dana Whitfield',
    assignmentGroup: 'Platform Engineering',
    callerEmail: 'monitoring@opscopilot.demo',
    openedAt: '2026-07-29T02:03:00Z',
    updatedAt: '2026-07-29T02:40:00Z',
    workNotes: [
      'Identified 40GB of unrotated application logs.',
      'Rotated logs and pruned stale container images; freed 55GB. Monitoring for trend.',
    ],
  },
  {
    number: 'INC0010260',
    shortDescription: 'Deployment pipeline stuck on health check',
    description:
      'Release 2026.7.29-rc2 deployed but held at post-deploy health check for 20 minutes.',
    state: 'new',
    priority: 2,
    assignedTo: 'Unassigned',
    assignmentGroup: 'Platform Engineering',
    callerEmail: 'marcus@opscopilot.demo',
    openedAt: '2026-07-29T18:22:00Z',
    updatedAt: '2026-07-29T18:22:00Z',
    workNotes: [],
  },
  {
    number: 'INC0010188',
    shortDescription: 'User seeing error code E-4471 on login',
    description:
      'Sales user intermittently sees E-4471 after being idle in the app for over an hour.',
    state: 'closed',
    priority: 4,
    assignedTo: 'Marcus Chen',
    assignmentGroup: 'Application Support',
    callerEmail: 'priya@opscopilot.demo',
    openedAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T09:15:00Z',
    workNotes: [
      'Expired token after idle period. User signed out/in. Confirmed resolved, no clock skew.',
    ],
  },
  {
    number: 'INC0010271',
    shortDescription: 'Sev-1: checkout API returning 500s',
    description:
      'Checkout API error rate spiked to 38% starting 07:02 UTC. Customer-facing impact confirmed.',
    state: 'in_progress',
    priority: 1,
    assignedTo: 'Dana Whitfield',
    assignmentGroup: 'Platform Engineering',
    callerEmail: 'monitoring@opscopilot.demo',
    openedAt: '2026-07-30T07:02:00Z',
    updatedAt: '2026-07-30T07:20:00Z',
    workNotes: [
      'Incident declared in #incidents within 4 minutes.',
      'Status page update posted. Root cause suspected: downstream payment provider latency.',
    ],
  },
] as const;

export function searchIncidents(params: {
  q?: string;
  state?: IncidentState;
  priority?: IncidentPriority;
  callerEmail?: string;
}): MockIncident[] {
  return MOCK_INCIDENTS.filter((incident) => {
    if (params.state && incident.state !== params.state) return false;
    if (params.priority && incident.priority !== params.priority) return false;
    if (params.callerEmail && incident.callerEmail !== params.callerEmail) return false;
    if (params.q) {
      const q = params.q.toLowerCase();
      const haystack =
        `${incident.number} ${incident.shortDescription} ${incident.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function getIncidentByNumber(number: string): MockIncident | undefined {
  return MOCK_INCIDENTS.find((i) => i.number.toLowerCase() === number.toLowerCase());
}

/** Extracts ServiceNow-style ticket numbers (`INC0010234`) mentioned in free text. */
export function extractIncidentNumbers(text: string): string[] {
  const matches = text.match(/\bINC\d{6,}\b/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.toUpperCase())));
}
