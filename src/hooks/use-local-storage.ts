'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * `useState` backed by `localStorage` (MASTER_BUILD_SPEC.md §23.3).
 *
 * SSR-safe: the initial render always returns `initialValue` (localStorage
 * does not exist on the server), then syncs from storage on mount. This
 * avoids a hydration mismatch at the cost of one extra render, which is the
 * correct tradeoff for UI state like "is the sidebar collapsed" that is not
 * visible above the fold before hydration completes.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Corrupt or inaccessible storage — fall back to initialValue silently.
    }
  }, [key]);

  const setStoredValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage unavailable (private browsing quota, etc.) — state still
          // updates in memory for this session.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setStoredValue];
}
