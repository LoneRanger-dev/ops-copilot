import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { KbChunk, KbDocument, HybridSearchResult } from '@/types/kb.types';
import type { DocVisibility } from '@/types/database.types';
import type { TablesInsert } from '@/lib/db/types';

/**
 * Knowledge base query module (MASTER_BUILD_SPEC.md §23.4 AI task 2). Wraps
 * the `hybrid_search_kb_chunks` RPC from `013_functions.sql` so Phase 6's
 * retriever agent calls a typed function, never raw SQL.
 */

export async function listKbDocuments(
  supabase: SupabaseClient<Database>,
  orgId: string,
): Promise<KbDocument[]> {
  const { data, error } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getKbDocument(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<KbDocument | null> {
  const { data, error } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertKbDocument(
  supabase: SupabaseClient<Database>,
  document: TablesInsert<'kb_documents'>,
): Promise<KbDocument> {
  const { data, error } = await supabase
    .from('kb_documents')
    .insert(document)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteKbDocument(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('kb_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function insertKbChunks(
  supabase: SupabaseClient<Database>,
  chunks: readonly TablesInsert<'kb_chunks'>[],
): Promise<KbChunk[]> {
  const { data, error } = await supabase
    .from('kb_chunks')
    .insert([...chunks])
    .select('*');
  if (error) throw error;
  return data ?? [];
}

export async function hybridSearchKbChunks(
  supabase: SupabaseClient<Database>,
  params: {
    queryEmbedding: number[];
    queryText: string;
    matchCount?: number;
    orgId?: string;
    maxVisibility?: DocVisibility;
  },
): Promise<HybridSearchResult[]> {
  const { data, error } = await supabase.rpc('hybrid_search_kb_chunks', {
    query_embedding: params.queryEmbedding,
    query_text: params.queryText,
    match_count: params.matchCount ?? 20,
    filter_org_id: params.orgId ?? null,
    max_visibility: params.maxVisibility ?? 'internal',
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    content: row.content,
    headingPath: row.heading_path,
    documentTitle: row.document_title,
    denseRank: row.dense_rank,
    sparseRank: row.sparse_rank,
    rrfScore: row.rrf_score,
  }));
}
