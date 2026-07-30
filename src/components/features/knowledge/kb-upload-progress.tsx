'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface KbUploadProgressProps {
  documentId: string;
  onDone?: () => void;
}

type PollStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

const STEPS: { key: PollStatus; label: string }[] = [
  { key: 'uploaded', label: 'Uploaded' },
  { key: 'processing', label: 'Processing' },
  { key: 'indexed', label: 'Indexed' },
];

/** Polls real job status (MASTER_BUILD_SPEC.md §23.5 frontend task 2, FR-KB-2). */
export function KbUploadProgress({ documentId, onDone }: KbUploadProgressProps) {
  const [status, setStatus] = useState<PollStatus>('uploaded');
  const [chunkCount, setChunkCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/v1/kb/documents/${documentId}`);
        const body = await response.json();
        if (cancelled || !body.success) return;

        const doc = body.data.document;
        setStatus(doc.status);
        setChunkCount(doc.chunk_count);
        setErrorMessage(doc.error_message);

        if (doc.status === 'indexed' || doc.status === 'failed') {
          onDone?.();
          return;
        }
      } catch {
        // Transient network error — the next poll tries again.
      }
      timer = setTimeout(poll, 2000);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone intentionally not a dependency
  }, [documentId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {STEPS.map((step, index) => {
          const stepIndex = STEPS.findIndex((s) => s.key === status);
          const isDone = status === 'failed' ? index < stepIndex : index <= stepIndex;
          const isCurrent = status !== 'failed' && index === stepIndex;

          return (
            <div key={step.key} className="flex items-center gap-2">
              {isCurrent ? (
                <Loader2Icon className="text-primary size-4 animate-spin" />
              ) : isDone ? (
                <CheckCircle2Icon className="text-success size-4" />
              ) : (
                <div className="border-border size-4 rounded-full border" />
              )}
              <span
                className={cn(
                  'text-sm',
                  isDone ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
                {step.key === 'indexed' && status === 'indexed'
                  ? ` (${chunkCount} chunks)`
                  : ''}
              </span>
              {index < STEPS.length - 1 && <div className="bg-border h-px w-8" />}
            </div>
          );
        })}
      </div>

      {status === 'failed' && (
        <div className="text-destructive flex items-center gap-2 text-sm">
          <XCircleIcon className="size-4" />
          {errorMessage ?? 'Indexing failed.'}
        </div>
      )}
    </div>
  );
}
