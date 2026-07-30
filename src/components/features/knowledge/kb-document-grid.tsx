import { SearchXIcon } from 'lucide-react';
import { KbDocumentCard, type KbListItem } from './kb-document-card';
import { EmptyState } from '@/components/shared/empty-state';

/** Grid of KB document cards, with an empty state for zero results (§23.5 frontend task 3). */
export function KbDocumentGrid({ items }: { items: readonly KbListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="No documents found"
        description="Try a different search term, or ask an admin to upload one."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <KbDocumentCard key={item.id} item={item} />
      ))}
    </div>
  );
}
