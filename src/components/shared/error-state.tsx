'use client';

import { AlertTriangleIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Surfaced so a user can quote it when reporting the issue (§8.2 `requestId`). */
  correlationId?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Shared error state (MASTER_BUILD_SPEC.md §23.3 frontend task 10).
 *
 * Plain-language message, an optional retry action, and a correlation ID —
 * never a raw stack trace or internal error code, which would leak
 * implementation details to the end user (§16 threat model).
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  correlationId,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-lg border px-6 py-16 text-center',
        className,
      )}
    >
      <div className="bg-destructive/10 text-destructive mb-4 flex size-12 items-center justify-center rounded-full">
        <AlertTriangleIcon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{message}</p>
      {correlationId && (
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          Reference: {correlationId}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcwIcon />
          Try again
        </Button>
      )}
    </div>
  );
}
