'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from './use-debounce';

/**
 * Client-side KB filtering (MASTER_BUILD_SPEC.md §23.5 frontend task 4).
 * Filters an already-fetched list by title/description/tags — a full
 * server-side hybrid search endpoint arrives with the real retrieval
 * pipeline in Phase 6; this hook's shape (query state in, filtered list
 * out) will not need to change when that lands.
 */
export function useKbSearch<
  T extends { title: string; description: string; tags: readonly string[] },
>(items: readonly T[]) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 200);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [items, debounced]);

  return { query, setQuery, results };
}
