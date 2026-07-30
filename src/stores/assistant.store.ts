import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AssistantState {
  /**
   * Persisted so the floating widget stays open across client-side
   * navigation (FR-WIDGET-8). Intelligence and message history arrive in
   * Phase 6 — this phase only tracks open/closed and an unread flag.
   */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

  hasUnread: boolean;
  markRead: () => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      isOpen: false,
      open: () => set({ isOpen: true, hasUnread: false }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen, hasUnread: false })),

      hasUnread: false,
      markRead: () => set({ hasUnread: false }),
    }),
    { name: 'opscopilot:assistant' },
  ),
);
