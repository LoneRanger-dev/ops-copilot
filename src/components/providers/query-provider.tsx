'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * TanStack Query client cache (MASTER_BUILD_SPEC.md §23.3, assumption A-28 —
 * Server Components first, TanStack Query for client cache).
 *
 * The client is created inside `useState` rather than at module scope so
 * each request gets its own instance under React Server Components — a
 * module-level singleton would leak cached data between users on the server.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
