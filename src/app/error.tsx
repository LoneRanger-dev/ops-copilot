'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/observability/logger';

/**
 * Root error boundary (section 15.4 rule 8).
 *
 * States what happened and offers a retry. The `digest` is Next.js's server-side
 * error identifier — surfacing it lets support correlate a user report with the
 * server log without exposing the stack trace.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error(
      { digest: error.digest, name: error.name, message: error.message },
      'Unhandled application error',
    );
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          The page could not be rendered. This has been logged. Retrying often resolves a
          transient failure.
        </p>

        {error.digest ? (
          <p className="text-muted-foreground mt-4 font-mono text-xs">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
