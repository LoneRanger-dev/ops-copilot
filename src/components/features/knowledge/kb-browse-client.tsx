'use client';

import { useKbSearch } from '@/hooks/use-kb-search';
import { KbSearch } from './kb-search';
import { KbDocumentGrid } from './kb-document-grid';
import type { KbListItem } from './kb-document-card';

/** Client search wrapper around the server-fetched KB list (§23.5 frontend task 4). */
export function KbBrowseClient({ items }: { items: readonly KbListItem[] }) {
  const { query, setQuery, results } = useKbSearch(items);

  return (
    <div className="flex flex-col gap-4">
      <KbSearch value={query} onChange={setQuery} />
      <KbDocumentGrid items={results} />
    </div>
  );
}
