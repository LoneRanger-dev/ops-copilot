'use client';

import { useEffect } from 'react';

interface ShortcutOptions {
  /** Require Ctrl on Windows/Linux or ⌘ on macOS. */
  meta?: boolean;
  /** Require Shift. */
  shift?: boolean;
  /** Prevent the browser default (e.g. Ctrl+K opening browser search). */
  preventDefault?: boolean;
  /** Disable the listener without unmounting the component. */
  enabled?: boolean;
}

/**
 * Binds a global keyboard shortcut (MASTER_BUILD_SPEC.md §23.3).
 *
 * Used for the ⌘K command palette and the Ctrl/⌘+/ floating assistant
 * toggle. `meta` matches `event.metaKey || event.ctrlKey` so the same
 * binding works as ⌘ on macOS and Ctrl on Windows/Linux without the caller
 * needing to branch on platform.
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {},
): void {
  const { meta = false, shift = false, preventDefault = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    function handler(event: KeyboardEvent) {
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const metaMatches = !meta || event.metaKey || event.ctrlKey;
      const shiftMatches = shift ? event.shiftKey : !event.shiftKey || true;

      if (keyMatches && metaMatches && shiftMatches) {
        if (preventDefault) event.preventDefault();
        callback(event);
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callback identity is allowed to change per render
  }, [key, meta, shift, preventDefault, enabled]);
}
