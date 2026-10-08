import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and resolves Tailwind conflicts, so a `className` passed
 * by the caller (e.g. `h-11`) reliably overrides a component default (`h-9`).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
