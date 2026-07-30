import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toRoute } from '@/lib/utils/routes';

export interface KbListItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly restricted: boolean;
  readonly chunkCount?: number;
  readonly status?: string;
}

/** One KB document card (MASTER_BUILD_SPEC.md §23.5 frontend task 3). */
export function KbDocumentCard({ item }: { item: KbListItem }) {
  return (
    <Link href={toRoute(`/knowledge/${item.id}`)}>
      <Card className="hover:border-primary/40 h-full transition-colors">
        <CardHeader>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.category}</Badge>
            {item.restricted && <Badge variant="secondary">Staff only</Badge>}
            {item.status && item.status !== 'indexed' && (
              <Badge variant="warning">{item.status}</Badge>
            )}
          </div>
          <CardTitle className="text-base">{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            {item.chunkCount !== undefined && (
              <span className="text-muted-foreground ml-auto text-xs">
                {item.chunkCount} chunks
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
