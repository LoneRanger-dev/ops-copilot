/**
 * Hand-authored Supabase database types.
 *
 * MASTER_BUILD_SPEC.md §23.2 calls for `npx supabase gen types typescript
 * --local > src/types/database.types.ts`, which requires a running local
 * Supabase stack. The hackathon portability override
 * (docs/IMPLEMENTATION_OVERRIDE.md) removes Docker, so there is no local
 * stack to generate against yet. This file is hand-authored from
 * `supabase/migrations/003_organizations.sql` and `004_profiles.sql` in the
 * exact shape the CLI produces, and MUST be regenerated (`npm run db:types`)
 * the moment a real Supabase project exists — at that point this comment
 * block should be deleted along with itself.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = 'end_user' | 'support_engineer' | 'manager' | 'admin';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
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
        };
        Insert: {
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
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
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
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_org_id_fkey';
            columns: ['org_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_role: { Args: Record<string, never>; Returns: UserRole };
      auth_org: { Args: Record<string, never>; Returns: string };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
    };
  };
}
