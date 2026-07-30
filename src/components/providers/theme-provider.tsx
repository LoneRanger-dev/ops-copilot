'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Wraps `next-themes` (MASTER_BUILD_SPEC.md §23.3 frontend task 7).
 *
 * `attribute="class"` toggles the `.dark` class that `globals.css`'s design
 * tokens already key off (carried over from the Phase 1 `prefers-color-scheme`
 * fallback). `disableTransitionOnChange` stops every colour-transitioning
 * element from animating at once when the theme flips. The anti-flash inline
 * script that `next-themes` injects into `<head>` is what makes "no flash of
 * wrong theme on reload" possible — it runs before React hydrates.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
