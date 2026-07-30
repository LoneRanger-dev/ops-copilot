import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/stores/ui.store';

function resetStore() {
  useUiStore.setState({ sidebarCollapsed: false, commandPaletteOpen: false });
}

describe('useUiStore', () => {
  beforeEach(resetStore);

  it('defaults to an expanded sidebar and closed command palette', () => {
    const state = useUiStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.commandPaletteOpen).toBe(false);
  });

  it('toggleSidebar flips sidebarCollapsed', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed sets an explicit value', () => {
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });

  it('setCommandPaletteOpen sets an explicit value', () => {
    useUiStore.getState().setCommandPaletteOpen(true);
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });
});
