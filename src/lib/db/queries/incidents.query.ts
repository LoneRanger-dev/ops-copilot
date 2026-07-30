import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { CachedIncident, SimilarIncident } from '@/types/incident.types';
import type { TablesInsert } from '@/lib/db/types';

/** ServiceNow cache query module (MASTER_BUILD_SPEC.md §23.4, FR-SNOW-5/10). */

export async function upsertCachedIncident(
  supabase: SupabaseClient<Database>,
  incident: TablesInsert<'snow_incident_cache'>,
): Promise<CachedIncident> {
  const { data, error } = await supabase
    .from('snow_incident_cache')
    .upsert(incident, { onConflict: 'org_id,number' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getCachedIncidentByNumber(
  supabase: SupabaseClient<Database>,
  orgId: string,
  number: string,
): Promise<CachedIncident | null> {
  const { data, error } = await supabase
    .from('snow_incident_cache')
    .select('*')
    .eq('org_id', orgId)
    .eq('number', number)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function matchSimilarIncidents(
  supabase: SupabaseClient<Database>,
  params: {
    queryEmbedding: number[];
    excludeNumber?: string;
    matchCount?: number;
    orgId?: string;
  },
): Promise<SimilarIncident[]> {
  const { data, error } = await supabase.rpc('match_similar_incidents', {
    query_embedding: params.queryEmbedding,
    exclude_number: params.excludeNumber ?? null,
    match_count: params.matchCount ?? 5,
    filter_org_id: params.orgId ?? null,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    number: row.number,
    shortDescription: row.short_description,
    state: row.state,
    priority: row.priority,
    resolutionNotes: row.resolution_notes,
    similarity: row.similarity,
    resolvedAt: row.resolved_at,
  }));
}
