'use client';

import { Toaster } from '@/components/ui/sonner';

/** Mounts the global toast surface once, in the root layout. */
export function ToastProvider() {
  return <Toaster closeButton richColors />;
}
