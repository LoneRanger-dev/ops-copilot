import type { Database } from '@/types/database.types';

/**
 * Small generic helpers so query modules don't repeat
 * `Database['public']['Tables'][...]` at every call site.
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];
