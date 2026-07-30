import { BookOpenIcon } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

/** Explains the widget's KB-only scope (MASTER_BUILD_SPEC.md §1.3, FR-WIDGET-3/4/5). */
export function AssistantEmpty() {
  return (
    <EmptyState
      icon={BookOpenIcon}
      title="Ask me about the knowledge base"
      description="I answer from the knowledge base only — I never read live ticket data or run multi-step tools. For diagnostics that need ServiceNow, use the full AI Chat."
      className="border-none px-4 py-10"
    />
  );
}
