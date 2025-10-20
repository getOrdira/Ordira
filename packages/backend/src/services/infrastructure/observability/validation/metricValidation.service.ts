import { createAppError } from '../../../../middleware/error.middleware';
import type { MetricData } from '../utils/types';

type MetricInput = Omit<MetricData, 'timestamp'>;
type TagInput = Record<string, unknown>;
type SanitizedTags = Record<string, string>;

const METRIC_NAME_REGEX = /^[a-zA-Z0-9._:-]+$/;
const MAX_METRIC_NAME_LENGTH = 128;
const MAX_TAGS = 16;
const MAX_TAG_KEY_LENGTH = 64;
const MAX_TAG_VALUE_LENGTH = 256;
const MAX_UNIT_LENGTH = 32;

const AGGREGATIONS = ['avg', 'min', 'max', 'sum', 'count'] as const;
export type MetricAggregation = typeof AGGREGATIONS[number];

export class MetricValidationService {
  /**
   * Ensure the provided metric name is a non-empty, well-formed string.
   */
  ensureMetricName(name: string): string {
    if (typeof name !== 'string') {
      throw createAppError('Metric name must be a string', 400, 'METRIC_INVALID_NAME_TYPE');
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw createAppError('Metric name is required', 400, 'METRIC_MISSING_NAME');
    }

    if (trimmed.length > MAX_METRIC_NAME_LENGTH) {
      throw createAppError(`Metric name cannot exceed ${MAX_METRIC_NAME_LENGTH} characters`, 400, 'METRIC_NAME_TOO_LONG');
    }

    if (!METRIC_NAME_REGEX.test(trimmed)) {
      throw createAppError('Metric name may only include letters, numbers, ".", "-", ":", or "_" characters', 400, 'METRIC_INVALID_NAME_FORMAT');
    }

    return trimmed;
  }

  /**
   * Ensure a metric value is a finite number.
   */
  ensureMetricValue(value: number): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw createAppError('Metric value must be a finite number', 400, 'METRIC_INVALID_VALUE');
    }

    return value;
  }

  /**
   * Ensure metric tags are provided as a small object with string-based values.
   */
  ensureTags(tags?: TagInput): SanitizedTags | undefined {
    if (tags === undefined || tags === null) {
      return undefined;
    }

    if (typeof tags !== 'object' || Array.isArray(tags)) {
      throw createAppError('Metric tags must be provided as an object', 400, 'METRIC_INVALID_TAGS');
    }

    const entries = Object.entries(tags);
    if (entries.length > MAX_TAGS) {
      throw createAppError(`Metric tags cannot contain more than ${MAX_TAGS} entries`, 400, 'METRIC_TOO_MANY_TAGS');
    }

    const sanitized: SanitizedTags = {};

    for (const [rawKey, rawValue] of entries) {
      const key = rawKey.trim();
      if (!key) {
        throw createAppError('Metric tag keys must be non-empty strings', 400, 'METRIC_INVALID_TAG_KEY');
      }

      if (key.length > MAX_TAG_KEY_LENGTH) {
        throw createAppError(`Metric tag keys cannot exceed ${MAX_TAG_KEY_LENGTH} characters`, 400, 'METRIC_TAG_KEY_TOO_LONG');
      }

      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      let value: string;
      if (typeof rawValue === 'string') {
        value = rawValue.trim();
      } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        value = String(rawValue);
      } else {
        throw createAppError('Metric tag values must be strings, numbers, or booleans', 400, 'METRIC_INVALID_TAG_VALUE');
      }

      if (!value) {
        throw createAppError('Metric tag values must be non-empty', 400, 'METRIC_EMPTY_TAG_VALUE');
      }

      if (value.length > MAX_TAG_VALUE_LENGTH) {
        throw createAppError(`Metric tag values cannot exceed ${MAX_TAG_VALUE_LENGTH} characters`, 400, 'METRIC_TAG_VALUE_TOO_LONG');
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Ensure the optional unit label remains short and well-formed.
   */
  ensureUnit(unit?: string | null): string | undefined {
    if (unit === undefined || unit === null) {
      return undefined;
    }

    if (typeof unit !== 'string') {
      throw createAppError('Metric unit must be a string', 400, 'METRIC_INVALID_UNIT_TYPE');
    }

    const trimmed = unit.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.length > MAX_UNIT_LENGTH) {
      throw createAppError(`Metric unit cannot exceed ${MAX_UNIT_LENGTH} characters`, 400, 'METRIC_UNIT_TOO_LONG');
    }

    return trimmed;
  }

  /**
   * Ensure metric timestamps are valid Date instances, defaulting to now when omitted.
   */
  ensureTimestamp(timestamp?: Date | string | number): Date {
    if (timestamp === undefined || timestamp === null) {
      return new Date();
    }

    if (timestamp instanceof Date) {
      if (Number.isNaN(timestamp.getTime())) {
        throw createAppError('Metric timestamp must be a valid Date', 400, 'METRIC_INVALID_TIMESTAMP');
      }
      return timestamp;
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      throw createAppError('Metric timestamp must be a valid Date', 400, 'METRIC_INVALID_TIMESTAMP');
    }

    return parsed;
  }

  /**
   * Validate a single metric payload prior to recording.
   */
  validateMetric(metric: MetricInput): MetricInput {
    return {
      name: this.ensureMetricName(metric.name),
      value: this.ensureMetricValue(metric.value),
      tags: this.ensureTags(metric.tags),
      unit: this.ensureUnit(metric.unit)
    };
  }

  /**
   * Validate a batch of metric payloads.
   */
  validateMetricBatch(metrics: MetricInput[]): MetricInput[] {
    if (!Array.isArray(metrics)) {
      throw createAppError('Metrics payload must be an array', 400, 'METRIC_INVALID_BATCH');
    }

    return metrics.map(metric => this.validateMetric(metric));
  }

  /**
   * Ensure a requested metric limit stays within supported bounds.
   */
  ensureLimit(limit?: number, max: number = 10000): number | undefined {
    if (limit === undefined || limit === null) {
      return undefined;
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw createAppError('Metric limit must be a positive integer', 400, 'METRIC_INVALID_LIMIT');
    }

    if (limit > max) {
      throw createAppError(`Metric limit cannot exceed ${max}`, 400, 'METRIC_LIMIT_TOO_HIGH');
    }

    return limit;
  }

  /**
   * Ensure the aggregation operator is supported.
   */
  ensureAggregation(aggregation: string): MetricAggregation {
    if (!AGGREGATIONS.includes(aggregation as MetricAggregation)) {
      throw createAppError(
        `Unsupported metric aggregation: ${aggregation}`,
        400,
        'METRIC_INVALID_AGGREGATION'
      );
    }

    return aggregation as MetricAggregation;
  }
}

export const metricValidationService = new MetricValidationService();
