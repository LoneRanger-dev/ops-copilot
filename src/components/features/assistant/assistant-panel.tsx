'use client';

import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAssistantStore } from '@/stores/assistant.store';
import { AssistantEmpty } from './assistant-empty';
import { AssistantInput } from './assistant-input';

/**
 * The widget panel (MASTER_BUILD_SPEC.md §23.3 frontend task 9).
 *
 * A fixed 400×600 popover on desktop; a full-height `Drawer` on mobile, where
 * a fixed-position popover would either overflow the viewport or cover the
 * entire screen anyway.
 */
export function AssistantPanel() {
  const isOpen = useAssistantStore((state) => state.isOpen);
  const close = useAssistantStore((state) => state.close);
  const isDesktop = useMediaQuery('(min-width: 640px)');

  if (!isOpen) return null;

  const content = (
    <>
      <AssistantEmpty />
      <AssistantInput />
    </>
  );

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>AI Assistant</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1">{content}</ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="AI Assistant"
      className="border-border bg-card animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 fixed right-6 bottom-24 z-50 flex h-[600px] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-lg border shadow-2xl duration-200"
    >
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-foreground text-sm font-semibold">AI Assistant</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={close}
          aria-label="Close"
        >
          <XIcon className="size-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">{content}</ScrollArea>
    </div>
  );
}
