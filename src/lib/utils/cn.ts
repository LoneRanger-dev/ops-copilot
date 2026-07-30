import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, resolving Tailwind conflicts.
 *
 * `clsx` handles conditionals; `twMerge` resolves collisions so a later class
 * wins over an earlier one in the same category (`px-2 px-4` -> `px-4`), which
 * plain string concatenation gets wrong.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
