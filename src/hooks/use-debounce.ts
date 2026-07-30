'use client';

import { useEffect, useState } from 'react';

/** Debounces a fast-changing value (MASTER_BUILD_SPEC.md §23.3). */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
