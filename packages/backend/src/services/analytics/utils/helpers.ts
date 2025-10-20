import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import type { AnalyticsGrouping, AnalyticsTimeRange } from './types';

/**
 * Normalize a time range ensuring start/end are valid Date instances.
 */
export function normalizeTimeRange(timeRange?: AnalyticsTimeRange | null): AnalyticsTimeRange | undefined {
  if (!timeRange) {
    return undefined;
  }

  const start = toDate(timeRange.start);
  const end = toDate(timeRange.end);

  if (!start || !end) {
    logger.warn('Invalid analytics time range provided', { timeRange });
    return undefined;
  }

  if (start > end) {
    return { start: end, end: start };
  }

  return { start, end };
}

/**
 * Convert an unknown value to Date if possible.
 */
export function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Calculate the number of whole days in a time range.
 */
export function calculateDurationInDays(timeRange?: AnalyticsTimeRange, fallback?: number): number {
  if (!timeRange) {
    return typeof fallback === 'number' ? fallback : 0;
  }

  const normalized = normalizeTimeRange(timeRange);
  if (!normalized) {
    return typeof fallback === 'number' ? fallback : 0;
  }

  const diff = normalized.end.getTime() - normalized.start.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (Number.isNaN(days) || !Number.isFinite(days) || days <= 0) {
    return typeof fallback === 'number' ? fallback : 0;
  }

  return days;
}

/**
 * Calculate an average per day from a total and optional range.
 */
export function calculateAveragePerDay(total: number, timeRange?: AnalyticsTimeRange, fallbackDays?: number): number {
  if (!Number.isFinite(total)) {
    return 0;
  }

  const days = calculateDurationInDays(timeRange, fallbackDays);
  if (!days) {
    return total;
  }

  return total / days;
}

/**
 * Calculate average votes per day using aggregation output.
 */
export function calculateAvgVotesPerDay(analyticsData: Array<{ totalVotes: number }>, timeRange?: AnalyticsTimeRange): number {
  if (!Array.isArray(analyticsData) || analyticsData.length === 0) {
    return 0;
  }

  const totalVotes = analyticsData.reduce((sum, item) => sum + safeNumber(item.totalVotes), 0);
  return calculateAveragePerDay(totalVotes, timeRange, analyticsData.length);
}

/**
 * Safe number conversion that strips non-finite values.
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Normalize grouping value to supported buckets.
 */
export function normalizeGrouping(groupBy?: AnalyticsGrouping): AnalyticsGrouping {
  if (groupBy === 'week' || groupBy === 'month') {
    return groupBy;
  }
  return 'day';
}

/**
 * Serialize params into a stable hash string for cache usage.
 */
export function hashCacheParams(params: unknown): string {
  const serialized = serializeParams(params);
  return crypto.createHash('sha1').update(serialized).digest('hex');
}

/**
 * Produce a stable JSON representation with sorted keys.
 */
export function serializeParams(params: unknown): string {
  const sorter = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(sorter);
    }
    if (value && typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      return sortedKeys.reduce((acc, key) => {
        acc[key] = sorter(value[key]);
        return acc;
      }, {} as Record<string, unknown>);
    }
    return value;
  };

  try {
    return JSON.stringify(sorter(params));
  } catch (error) {
    logger.error('Failed to serialize analytics cache params', { error, params });
    return '';
  }
}

/**
 * Utility to build cache metadata payloads.
 */
export function buildCacheParams(segment: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    segment,
    ...params
  };
}

/**
 * Derive ISO date string from Date for reporting.
 */
export function toISODateString(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}
