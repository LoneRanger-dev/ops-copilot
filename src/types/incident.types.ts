import type { Tables } from '@/lib/db/types';

export type CachedIncident = Tables<'snow_incident_cache'>;
export type Escalation = Tables<'escalations'>;

export interface SimilarIncident {
  readonly number: string;
  readonly shortDescription: string;
  readonly state: CachedIncident['state'];
  readonly priority: number | null;
  readonly resolutionNotes: string | null;
  readonly similarity: number;
  readonly resolvedAt: string | null;
}
