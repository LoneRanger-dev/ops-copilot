'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query (MASTER_BUILD_SPEC.md §23.3).
 *
 * Used by the sidebar/topbar to switch between the persistent desktop shell
 * and the `Sheet`-based mobile navigation below the `lg` breakpoint (1024px).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
