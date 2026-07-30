import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface LoadingSkeletonProps {
  /** Number of skeleton rows to render. */
  rows?: number;
  className?: string;
}

/** Generic loading placeholder (MASTER_BUILD_SPEC.md §23.3 frontend task 10). */
export function LoadingSkeleton({ rows = 3, className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** A single KPI/stat card skeleton, matching `kpi-card.tsx`'s eventual shape. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('border-border rounded-lg border p-6', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}
