import { Badge } from '@/components/ui/badge';
import { RelativeTime } from '@/components/shared/relative-time';

interface KbIndexStatusProps {
  status: string;
  chunkCount: number;
  indexedAt: string | null;
  errorMessage: string | null;
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'warning' | 'destructive' | 'success'
> = {
  uploaded: 'secondary',
  processing: 'warning',
  indexed: 'success',
  failed: 'destructive',
  superseded: 'secondary',
};

/** Per-document indexing health (MASTER_BUILD_SPEC.md §23.5 frontend task 7, FR-KB-9). */
export function KbIndexStatus({
  status,
  chunkCount,
  indexedAt,
  errorMessage,
}: KbIndexStatusProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{status}</Badge>
        {status === 'indexed' && (
          <span className="text-muted-foreground text-xs">{chunkCount} chunks</span>
        )}
      </div>
      {indexedAt && (
        <span className="text-muted-foreground text-xs">
          Last indexed <RelativeTime dateTime={indexedAt} />
        </span>
      )}
      {status === 'failed' && errorMessage && (
        <span className="text-destructive text-xs">{errorMessage}</span>
      )}
    </div>
  );
}
