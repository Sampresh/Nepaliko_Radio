import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn's class helper: clsx resolves conditionals, tailwind-merge then drops
 * earlier Tailwind utilities that a later one overrides, so a `className` prop
 * can override a component's own defaults instead of fighting them on specificity.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
