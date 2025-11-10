// src/lib/utils/date.ts
// Date and time helpers used across the frontend.

const DATE_LOCALE = 'en-US';

export type DateFormat = 'short' | 'long' | 'relative';

export const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: Date | string, format: DateFormat = 'short'): string => {
  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  switch (format) {
    case 'long':
      return date.toLocaleString(DATE_LOCALE, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'relative':
      return formatRelativeTime(date);
    case 'short':
    default:
      return date.toLocaleDateString(DATE_LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
  }
};

export const formatRelativeTime = (value: Date | string): string => {
  const date = toDate(value);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

export const isDateInRange = (
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean => {
  const target = toDate(date).getTime();
  const start = toDate(startDate).getTime();
  const end = toDate(endDate).getTime();

  return target >= start && target <= end;
};

export const calculateResponseTime = (
  sentAt: Date | string,
  respondedAt: Date | string | null
): string | null => {
  if (!respondedAt) return null;

  const sent = toDate(sentAt);
  const responded = toDate(respondedAt);
  const diffInHours = Math.abs(responded.getTime() - sent.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return 'within an hour';
  if (diffInHours < 24) return `${Math.round(diffInHours)} hours`;
  if (diffInHours < 168) return `${Math.round(diffInHours / 24)} days`;
  return `${Math.round(diffInHours / 168)} weeks`;
};


