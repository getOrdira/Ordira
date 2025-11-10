// src/lib/utils/array.ts
// Array helpers shared across the frontend.

/**
 * Group an array of items by the provided key.
 */
export const groupBy = <T extends Record<string, any>, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> =>
  items.reduce<Record<string, T[]>>((accumulator, item) => {
    const group = String(item[key]);
    if (!accumulator[group]) {
      accumulator[group] = [];
    }
    accumulator[group].push(item);
    return accumulator;
  }, {});

/**
 * Return a new array with duplicate items removed based on the provided key.
 */
export const uniqueBy = <T extends Record<string, any>, K extends keyof T>(
  items: T[],
  key: K
): T[] => {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Sort an array using one or more keys.
 */
export const sortBy = <T extends Record<string, any>>(
  items: T[],
  ...keys: (keyof T)[]
): T[] => {
  if (keys.length === 0) {
    return items;
  }

  return [...items].sort((a, b) => {
    for (const key of keys) {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue === bValue) {
        continue;
      }

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
    }
    return 0;
  });
};

/**
 * Chunk an array into equally sized pieces.
 */
export const chunk = <T>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Flatten a two-dimensional array into a single array.
 */
export const flatten = <T>(items: T[][]): T[] => items.reduce((acc, value) => acc.concat(value), []);


