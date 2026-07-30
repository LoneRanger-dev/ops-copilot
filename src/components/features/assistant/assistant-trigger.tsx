'use client';

import { MessageCircleIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useAssistantStore } from '@/stores/assistant.store';

/** Fixed bottom-right FAB (MASTER_BUILD_SPEC.md §23.3 frontend task 9). */
export function AssistantTrigger() {
  const isOpen = useAssistantStore((state) => state.isOpen);
  const hasUnread = useAssistantStore((state) => state.hasUnread);
  const toggle = useAssistantStore((state) => state.toggle);

  return (
    <Button
      type="button"
      size="icon"
      onClick={toggle}
      aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      aria-expanded={isOpen}
      className={cn(
        'fixed right-6 bottom-6 z-50 size-14 rounded-full shadow-lg transition-transform hover:scale-105',
      )}
    >
      {isOpen ? <XIcon className="size-6" /> : <MessageCircleIcon className="size-6" />}
      {hasUnread && !isOpen && (
        <span className="border-background absolute top-1 right-1 size-3 rounded-full border-2 bg-[var(--destructive)]" />
      )}
    </Button>
  );
}
