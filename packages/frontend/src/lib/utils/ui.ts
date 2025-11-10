// src/lib/utils/ui.ts
// UI specific helpers.

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind awareness.
 * Equivalent to the classic `cn` helper used across the UI codebase.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));


