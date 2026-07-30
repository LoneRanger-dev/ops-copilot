import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { InboxIcon, type LucideIcon } from 'lucide-react';

export interface DataTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly className?: string;
}

interface DataTableProps<T> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: readonly T[];
  getRowKey: (row: T) => string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Minimal, presentational table (MASTER_BUILD_SPEC.md §23.3 shared components).
 *
 * Deliberately does not depend on `@tanstack/react-table` — sorting,
 * filtering, and pagination are added per-feature in the phases that need
 * them (incidents in Phase 8, KB and admin tables in Phase 5/9) rather than
 * generalised here ahead of a concrete requirement.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyIcon: EmptyIcon = InboxIcon,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={EmptyIcon}
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
      />
    );
  }

  return (
    <div className="border-border rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
