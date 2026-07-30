/**
 * Hand-authored Supabase database types — extended for Phase 4.
 *
 * MASTER_BUILD_SPEC.md §23.4 calls for `npm run db:types` (backed by
 * `supabase gen types typescript --local`), which requires a running local
 * Supabase/Postgres stack. Per the hackathon portability override
 * (docs/IMPLEMENTATION_OVERRIDE.md) no Docker/local stack exists in this
 * environment, so this file is hand-authored directly from
 * `supabase/migrations/001-013,015` in the exact shape the CLI produces.
 * MUST be regenerated the moment a real Supabase project exists.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = 'end_user' | 'support_engineer' | 'manager' | 'admin';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type SurfaceType = 'chat' | 'widget';
export type DocStatus = 'uploaded' | 'processing' | 'indexed' | 'failed' | 'superseded';
export type DocVisibility = 'public' | 'internal' | 'restricted';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
export type JobType =
  | 'document.ingest'
  | 'document.reindex'
  | 'incident.sync'
  | 'memory.summarise'
  | 'analytics.rollup'
  | 'retention.purge';
export type TraceStatus = 'running' | 'completed' | 'partial' | 'failed' | 'blocked';
export type RiskLevel = 'safe' | 'caution' | 'dangerous';
export type FeedbackRating = 'positive' | 'negative';
export type EscalationStatus = 'open' | 'acknowledged' | 'resolved' | 'cancelled';
export type IncidentState =
  'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'cancelled';

interface Table<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      organizations: Table<
        {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        }>
      >;
      profiles: Table<
        {
          id: string;
          org_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          department: string | null;
          job_title: string | null;
          is_active: boolean;
          mfa_enrolled: boolean;
          last_seen_at: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          org_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          department?: string | null;
          job_title?: string | null;
          is_active?: boolean;
          mfa_enrolled?: boolean;
          last_seen_at?: string | null;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          department: string | null;
          job_title: string | null;
          is_active: boolean;
          mfa_enrolled: boolean;
          last_seen_at: string | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        }>
      >;
      conversations: Table<
        {
          id: string;
          org_id: string;
          user_id: string;
          title: string;
          status: ConversationStatus;
          surface: SurfaceType;
          message_count: number;
          total_tokens: number;
          total_cost_usd: number;
          last_message_at: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        },
        {
          id?: string;
          org_id: string;
          user_id: string;
          title?: string;
          status?: ConversationStatus;
          surface?: SurfaceType;
          message_count?: number;
          total_tokens?: number;
          total_cost_usd?: number;
          last_message_at?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        },
        Partial<{
          id: string;
          org_id: string;
          user_id: string;
          title: string;
          status: ConversationStatus;
          surface: SurfaceType;
          message_count: number;
          total_tokens: number;
          total_cost_usd: number;
          last_message_at: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        }>
      >;
      messages: Table<
        {
          id: string;
          conversation_id: string;
          user_id: string | null;
          role: MessageRole;
          content: string;
          parts: Json;
          tool_calls: Json | null;
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          cost_usd: number | null;
          latency_ms: number | null;
          cache_hit: boolean;
          groundedness: number | null;
          risk_level: RiskLevel | null;
          trace_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          conversation_id: string;
          user_id?: string | null;
          role: MessageRole;
          content: string;
          parts?: Json;
          tool_calls?: Json | null;
          model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          cost_usd?: number | null;
          latency_ms?: number | null;
          cache_hit?: boolean;
          groundedness?: number | null;
          risk_level?: RiskLevel | null;
          trace_id?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          conversation_id: string;
          user_id: string | null;
          role: MessageRole;
          content: string;
          parts: Json;
          tool_calls: Json | null;
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          cost_usd: number | null;
          latency_ms: number | null;
          cache_hit: boolean;
          groundedness: number | null;
          risk_level: RiskLevel | null;
          trace_id: string | null;
          created_at: string;
        }>
      >;
      attachments: Table<
        {
          id: string;
          message_id: string;
          user_id: string;
          filename: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          extracted_text: string | null;
          created_at: string;
        },
        {
          id?: string;
          message_id: string;
          user_id: string;
          filename: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          extracted_text?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          message_id: string;
          user_id: string;
          filename: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          extracted_text: string | null;
          created_at: string;
        }>
      >;
      kb_documents: Table<
        {
          id: string;
          org_id: string;
          title: string;
          description: string | null;
          source_type: string;
          source_url: string | null;
          filename: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          raw_content: string | null;
          category: string | null;
          tags: string[];
          visibility: DocVisibility;
          status: DocStatus;
          version: number;
          supersedes_id: string | null;
          chunk_count: number;
          error_message: string | null;
          indexed_at: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        },
        {
          id?: string;
          org_id: string;
          title: string;
          description?: string | null;
          source_type?: string;
          source_url?: string | null;
          filename?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          raw_content?: string | null;
          category?: string | null;
          tags?: string[];
          visibility?: DocVisibility;
          status?: DocStatus;
          version?: number;
          supersedes_id?: string | null;
          chunk_count?: number;
          error_message?: string | null;
          indexed_at?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        },
        Partial<{
          id: string;
          org_id: string;
          title: string;
          description: string | null;
          source_type: string;
          source_url: string | null;
          filename: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          raw_content: string | null;
          category: string | null;
          tags: string[];
          visibility: DocVisibility;
          status: DocStatus;
          version: number;
          supersedes_id: string | null;
          chunk_count: number;
          error_message: string | null;
          indexed_at: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        }>
      >;
      kb_document_versions: Table<
        {
          id: string;
          document_id: string;
          version: number;
          raw_content: string;
          changed_by: string | null;
          change_note: string | null;
          created_at: string;
        },
        {
          id?: string;
          document_id: string;
          version: number;
          raw_content: string;
          changed_by?: string | null;
          change_note?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          document_id: string;
          version: number;
          raw_content: string;
          changed_by: string | null;
          change_note: string | null;
          created_at: string;
        }>
      >;
      kb_chunks: Table<
        {
          id: string;
          document_id: string;
          org_id: string;
          chunk_index: number;
          content: string;
          heading_path: string[];
          token_count: number;
          embedding: number[] | null;
          visibility: DocVisibility;
          metadata: Json;
          created_at: string;
        },
        {
          id?: string;
          document_id: string;
          org_id: string;
          chunk_index: number;
          content: string;
          heading_path?: string[];
          token_count: number;
          embedding?: number[] | null;
          visibility?: DocVisibility;
          metadata?: Json;
          created_at?: string;
        },
        Partial<{
          id: string;
          document_id: string;
          org_id: string;
          chunk_index: number;
          content: string;
          heading_path: string[];
          token_count: number;
          embedding: number[] | null;
          visibility: DocVisibility;
          metadata: Json;
          created_at: string;
        }>
      >;
      snow_incident_cache: Table<
        {
          id: string;
          org_id: string;
          sys_id: string;
          number: string;
          record_type: string;
          short_description: string;
          description: string | null;
          state: IncidentState;
          priority: number | null;
          urgency: number | null;
          impact: number | null;
          category: string | null;
          subcategory: string | null;
          assignment_group: string | null;
          assigned_to: string | null;
          caller_id: string | null;
          caller_email: string | null;
          opened_at: string | null;
          resolved_at: string | null;
          closed_at: string | null;
          resolution_notes: string | null;
          work_notes: Json;
          sla_due_at: string | null;
          sla_breached: boolean;
          embedding: number[] | null;
          raw: Json;
          fetched_at: string;
        },
        {
          id?: string;
          org_id: string;
          sys_id: string;
          number: string;
          record_type?: string;
          short_description: string;
          description?: string | null;
          state: IncidentState;
          priority?: number | null;
          urgency?: number | null;
          impact?: number | null;
          category?: string | null;
          subcategory?: string | null;
          assignment_group?: string | null;
          assigned_to?: string | null;
          caller_id?: string | null;
          caller_email?: string | null;
          opened_at?: string | null;
          resolved_at?: string | null;
          closed_at?: string | null;
          resolution_notes?: string | null;
          work_notes?: Json;
          sla_due_at?: string | null;
          sla_breached?: boolean;
          embedding?: number[] | null;
          raw: Json;
          fetched_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          sys_id: string;
          number: string;
          record_type: string;
          short_description: string;
          description: string | null;
          state: IncidentState;
          priority: number | null;
          urgency: number | null;
          impact: number | null;
          category: string | null;
          subcategory: string | null;
          assignment_group: string | null;
          assigned_to: string | null;
          caller_id: string | null;
          caller_email: string | null;
          opened_at: string | null;
          resolved_at: string | null;
          closed_at: string | null;
          resolution_notes: string | null;
          work_notes: Json;
          sla_due_at: string | null;
          sla_breached: boolean;
          embedding: number[] | null;
          raw: Json;
          fetched_at: string;
        }>
      >;
      conversation_summaries: Table<
        {
          id: string;
          conversation_id: string;
          summary: string;
          key_facts: Json;
          entities: Json;
          covers_up_to_message_id: string | null;
          message_count: number;
          token_count: number;
          created_at: string;
        },
        {
          id?: string;
          conversation_id: string;
          summary: string;
          key_facts?: Json;
          entities?: Json;
          covers_up_to_message_id?: string | null;
          message_count: number;
          token_count: number;
          created_at?: string;
        },
        Partial<{
          id: string;
          conversation_id: string;
          summary: string;
          key_facts: Json;
          entities: Json;
          covers_up_to_message_id: string | null;
          message_count: number;
          token_count: number;
          created_at: string;
        }>
      >;
      user_memory: Table<
        {
          id: string;
          user_id: string;
          org_id: string;
          fact: string;
          category: string;
          confidence: number;
          embedding: number[] | null;
          source_conversation_id: string | null;
          reinforced_count: number;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          org_id: string;
          fact: string;
          category: string;
          confidence?: number;
          embedding?: number[] | null;
          source_conversation_id?: string | null;
          reinforced_count?: number;
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          user_id: string;
          org_id: string;
          fact: string;
          category: string;
          confidence: number;
          embedding: number[] | null;
          source_conversation_id: string | null;
          reinforced_count: number;
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        }>
      >;
      ai_traces: Table<
        {
          id: string;
          org_id: string;
          conversation_id: string | null;
          message_id: string | null;
          user_id: string;
          surface: SurfaceType;
          query: string;
          intent: string | null;
          complexity: string | null;
          plan: Json | null;
          route: Json | null;
          status: TraceStatus;
          groundedness: number | null;
          risk_level: RiskLevel | null;
          step_count: number;
          retrieval_count: number;
          tool_call_count: number;
          cache_hit: boolean;
          total_prompt_tokens: number;
          total_completion_tokens: number;
          total_cost_usd: number;
          duration_ms: number | null;
          error: Json | null;
          created_at: string;
        },
        {
          id?: string;
          org_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          user_id: string;
          surface: SurfaceType;
          query: string;
          intent?: string | null;
          complexity?: string | null;
          plan?: Json | null;
          route?: Json | null;
          status?: TraceStatus;
          groundedness?: number | null;
          risk_level?: RiskLevel | null;
          step_count?: number;
          retrieval_count?: number;
          tool_call_count?: number;
          cache_hit?: boolean;
          total_prompt_tokens?: number;
          total_completion_tokens?: number;
          total_cost_usd?: number;
          duration_ms?: number | null;
          error?: Json | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          conversation_id: string | null;
          message_id: string | null;
          user_id: string;
          surface: SurfaceType;
          query: string;
          intent: string | null;
          complexity: string | null;
          plan: Json | null;
          route: Json | null;
          status: TraceStatus;
          groundedness: number | null;
          risk_level: RiskLevel | null;
          step_count: number;
          retrieval_count: number;
          tool_call_count: number;
          cache_hit: boolean;
          total_prompt_tokens: number;
          total_completion_tokens: number;
          total_cost_usd: number;
          duration_ms: number | null;
          error: Json | null;
          created_at: string;
        }>
      >;
      ai_trace_steps: Table<
        {
          id: string;
          trace_id: string;
          step_index: number;
          agent_name: string;
          step_type: string;
          input: Json | null;
          output: Json | null;
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          cost_usd: number | null;
          duration_ms: number | null;
          cache_hit: boolean;
          status: string;
          error: Json | null;
          created_at: string;
        },
        {
          id?: string;
          trace_id: string;
          step_index: number;
          agent_name: string;
          step_type: string;
          input?: Json | null;
          output?: Json | null;
          model?: string | null;
          prompt_tokens?: number | null;
          completion_tokens?: number | null;
          cost_usd?: number | null;
          duration_ms?: number | null;
          cache_hit?: boolean;
          status: string;
          error?: Json | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          trace_id: string;
          step_index: number;
          agent_name: string;
          step_type: string;
          input: Json | null;
          output: Json | null;
          model: string | null;
          prompt_tokens: number | null;
          completion_tokens: number | null;
          cost_usd: number | null;
          duration_ms: number | null;
          cache_hit: boolean;
          status: string;
          error: Json | null;
          created_at: string;
        }>
      >;
      feedback: Table<
        {
          id: string;
          org_id: string;
          message_id: string;
          user_id: string;
          rating: FeedbackRating;
          reason: string | null;
          comment: string | null;
          categories: string[];
          created_at: string;
        },
        {
          id?: string;
          org_id: string;
          message_id: string;
          user_id: string;
          rating: FeedbackRating;
          reason?: string | null;
          comment?: string | null;
          categories?: string[];
          created_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          message_id: string;
          user_id: string;
          rating: FeedbackRating;
          reason: string | null;
          comment: string | null;
          categories: string[];
          created_at: string;
        }>
      >;
      escalations: Table<
        {
          id: string;
          org_id: string;
          user_id: string;
          conversation_id: string | null;
          incident_number: string | null;
          reason: string;
          urgency: string;
          status: EscalationStatus;
          assigned_to: string | null;
          ai_summary: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          org_id: string;
          user_id: string;
          conversation_id?: string | null;
          incident_number?: string | null;
          reason: string;
          urgency: string;
          status?: EscalationStatus;
          assigned_to?: string | null;
          ai_summary?: string | null;
          resolved_at?: string | null;
          resolution_note?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          user_id: string;
          conversation_id: string | null;
          incident_number: string | null;
          reason: string;
          urgency: string;
          status: EscalationStatus;
          assigned_to: string | null;
          ai_summary: string | null;
          resolved_at: string | null;
          resolution_note: string | null;
          created_at: string;
          updated_at: string;
        }>
      >;
      audit_logs: Table<
        {
          id: string;
          org_id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          before: Json | null;
          after: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          request_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          org_id: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          request_id?: string | null;
          created_at?: string;
        },
        Record<string, never> // append-only: no UPDATE policy exists for any role
      >;
      feature_flags: Table<
        {
          key: string;
          enabled: boolean;
          description: string;
          rollout_percentage: number;
          updated_by: string | null;
          updated_at: string;
        },
        {
          key: string;
          enabled?: boolean;
          description: string;
          rollout_percentage?: number;
          updated_by?: string | null;
          updated_at?: string;
        },
        Partial<{
          key: string;
          enabled: boolean;
          description: string;
          rollout_percentage: number;
          updated_by: string | null;
          updated_at: string;
        }>
      >;
      job_queue: Table<
        {
          id: string;
          org_id: string;
          job_type: JobType;
          payload: Json;
          status: JobStatus;
          priority: number;
          attempts: number;
          max_attempts: number;
          run_after: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          completed_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          org_id: string;
          job_type: JobType;
          payload: Json;
          status?: JobStatus;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          run_after?: string;
          locked_at?: string | null;
          locked_by?: string | null;
          last_error?: string | null;
          completed_at?: string | null;
          created_at?: string;
        },
        Partial<{
          id: string;
          org_id: string;
          job_type: JobType;
          payload: Json;
          status: JobStatus;
          priority: number;
          attempts: number;
          max_attempts: number;
          run_after: string;
          locked_at: string | null;
          locked_by: string | null;
          last_error: string | null;
          completed_at: string | null;
          created_at: string;
        }>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      auth_org: { Args: Record<string, never>; Returns: string };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      match_kb_chunks: {
        Args: {
          query_embedding: number[];
          match_count?: number;
          filter_org_id?: string | null;
          max_visibility?: DocVisibility;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          content: string;
          heading_path: string[];
          similarity: number;
          document_title: string;
        }[];
      };
      hybrid_search_kb_chunks: {
        Args: {
          query_embedding: number[];
          query_text: string;
          match_count?: number;
          rrf_k?: number;
          filter_org_id?: string | null;
          max_visibility?: DocVisibility;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          content: string;
          heading_path: string[];
          document_title: string;
          dense_rank: number | null;
          sparse_rank: number | null;
          rrf_score: number;
        }[];
      };
      match_similar_incidents: {
        Args: {
          query_embedding: number[];
          exclude_number?: string | null;
          match_count?: number;
          filter_org_id?: string | null;
        };
        Returns: {
          number: string;
          short_description: string;
          state: IncidentState;
          priority: number | null;
          resolution_notes: string | null;
          similarity: number;
          resolved_at: string | null;
        }[];
      };
      match_user_memory: {
        Args: {
          query_embedding: number[];
          target_user_id: string;
          match_count?: number;
          min_similarity?: number;
        };
        Returns: {
          fact: string;
          category: string;
          confidence: number;
          similarity: number;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      conversation_status: ConversationStatus;
      message_role: MessageRole;
      surface_type: SurfaceType;
      doc_status: DocStatus;
      doc_visibility: DocVisibility;
      job_status: JobStatus;
      job_type: JobType;
      trace_status: TraceStatus;
      risk_level: RiskLevel;
      feedback_rating: FeedbackRating;
      escalation_status: EscalationStatus;
      incident_state: IncidentState;
    };
  };
}
