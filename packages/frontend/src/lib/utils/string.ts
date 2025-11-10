// src/lib/utils/string.ts
// String helpers shared across the frontend.

export const generateSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const truncateText = (text: string, maxLength = 100): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}…`;
};

export const truncateWords = (text: string, maxWords = 20): string => {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) {
    return text;
  }
  return `${words.slice(0, maxWords).join(' ')}…`;
};

export const capitalize = (value: string): string =>
  value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const camelToTitle = (value: string): string =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

export const generateId = (length = 8): string =>
  Math.random().toString(36).substring(2, 2 + length);

export const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

export const generateVerificationCode = (length = 24): string =>
  Array.from({ length }, () => Math.floor(Math.random() * 36).toString(36)).join('');


