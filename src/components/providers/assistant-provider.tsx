'use client';

import * as React from 'react';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { useAssistantStore } from '@/stores/assistant.store';

/**
 * Wires the floating assistant's global keyboard shortcut (MASTER_BUILD_SPEC.md
 * §23.3 frontend task 9 — `Ctrl/⌘ + /` toggles it).
 *
 * Separated from `<FloatingAssistant>` itself so the shortcut is live
 * everywhere the provider is mounted, independent of whether the trigger or
 * panel happen to be rendered — the store is the single source of truth
 * either way.
 */
export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const toggle = useAssistantStore((state) => state.toggle);

  useKeyboardShortcut('/', () => toggle(), { meta: true });

  return <>{children}</>;
}
