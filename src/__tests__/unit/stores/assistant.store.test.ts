import { beforeEach, describe, expect, it } from 'vitest';
import { useAssistantStore } from '@/stores/assistant.store';

function resetStore() {
  useAssistantStore.setState({ isOpen: false, hasUnread: false });
}

describe('useAssistantStore', () => {
  beforeEach(resetStore);

  it('defaults to closed with no unread indicator', () => {
    const state = useAssistantStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.hasUnread).toBe(false);
  });

  it('open() opens the panel and clears unread', () => {
    useAssistantStore.setState({ hasUnread: true });
    useAssistantStore.getState().open();
    expect(useAssistantStore.getState().isOpen).toBe(true);
    expect(useAssistantStore.getState().hasUnread).toBe(false);
  });

  it('close() closes the panel', () => {
    useAssistantStore.getState().open();
    useAssistantStore.getState().close();
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });

  it('toggle() flips isOpen and clears unread', () => {
    useAssistantStore.getState().toggle();
    expect(useAssistantStore.getState().isOpen).toBe(true);
    useAssistantStore.getState().toggle();
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });

  it('markRead() clears the unread flag without changing open state', () => {
    useAssistantStore.setState({ hasUnread: true, isOpen: false });
    useAssistantStore.getState().markRead();
    expect(useAssistantStore.getState().hasUnread).toBe(false);
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });
});
