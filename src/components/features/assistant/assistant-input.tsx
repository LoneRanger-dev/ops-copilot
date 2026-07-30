'use client';

import { SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Input row (MASTER_BUILD_SPEC.md §23.3 frontend task 9).
 *
 * Present but disabled this phase — intelligence (streaming KB-only answers)
 * arrives in Phase 6. Rendering a real, disabled control rather than hiding
 * it communicates that the feature exists and is coming, per FR-WIDGET-3.
 */
export function AssistantInput() {
  return (
    <form
      className="border-border flex items-center gap-2 border-t p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <Input
        disabled
        placeholder="Coming in Phase 6 — knowledge base Q&A"
        aria-label="Ask the knowledge base"
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled aria-label="Send">
        <SendIcon className="size-4" />
      </Button>
    </form>
  );
}
