'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCwIcon, TrashIcon } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type DataTableColumn } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { KbIndexStatus } from './kb-index-status';
import type { KbDocument } from '@/types/kb.types';

/** Admin KB management table (MASTER_BUILD_SPEC.md §23.5 frontend task 6). */
export function KbDocumentTable({ documents }: { documents: readonly KbDocument[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function reindex(id: string) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/v1/kb/documents/${id}/reindex`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Reindex request failed.');
      toast.success('Reindex queued.');
      router.refresh();
    } catch {
      toast.error('Failed to queue reindex.');
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/v1/kb/documents/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete request failed.');
      toast.success('Document deleted.');
      router.refresh();
    } catch {
      toast.error('Failed to delete document.');
    } finally {
      setPendingId(null);
    }
  }

  const columns: DataTableColumn<KbDocument>[] = [
    { key: 'title', header: 'Title', render: (d) => d.title },
    { key: 'category', header: 'Category', render: (d) => d.category ?? '—' },
    { key: 'visibility', header: 'Visibility', render: (d) => d.visibility },
    {
      key: 'status',
      header: 'Index health',
      render: (d) => (
        <KbIndexStatus
          status={d.status}
          chunkCount={d.chunk_count}
          indexedAt={d.indexed_at}
          errorMessage={d.error_message}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pendingId === d.id}
            onClick={() => reindex(d.id)}
          >
            <RefreshCwIcon className="size-3.5" /> Reindex
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm" disabled={pendingId === d.id}>
                <TrashIcon className="size-3.5" /> Delete
              </Button>
            }
            title={`Delete "${d.title}"?`}
            description="This permanently deletes the document and all of its indexed chunks. This cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={() => remove(d.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={documents}
      getRowKey={(d) => d.id}
      emptyTitle="No documents uploaded yet"
      emptyDescription="Upload a document to start building the knowledge base."
    />
  );
}
