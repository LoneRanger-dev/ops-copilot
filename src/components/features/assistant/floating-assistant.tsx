'use client';

import { useEffect, useRef } from 'react';
import { useAssistantStore } from '@/stores/assistant.store';
import { AssistantPanel } from './assistant-panel';
import { AssistantTrigger } from './assistant-trigger';

/**
 * The floating assistant's root (MASTER_BUILD_SPEC.md §23.3 frontend task 9).
 *
 * Mounted exactly once, in `(dashboard)/layout.tsx` — never per page — so
 * open/closed state and (from Phase 6) conversation state survive client-side
 * navigation between dashboard pages (FR-WIDGET-8).
 */
export function FloatingAssistant() {
  const close = useAssistantStore((state) => state.close);
  const isOpen = useAssistantStore((state) => state.isOpen);
  const rootRef = useRef<HTMLDivElement>(null);

  // Escape closes the panel from anywhere on the page (§23.3 acceptance criteria).
  useEffect(() => {
    if (!isOpen) return;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    // A click outside the trigger+panel closes it. The listener is scoped to
    // this component's own root so clicking the trigger toggles exactly
    // once, rather than "outside click closes" firing first and the
    // trigger's own onClick immediately reopening it.
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        close();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, close]);

  return (
    <div ref={rootRef}>
      <AssistantPanel />
      <AssistantTrigger />
    </div>
  );
}
