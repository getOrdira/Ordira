import { createAppError } from '../../../../middleware/error.middleware';
import type {
  Alert,
  AlertRule,
  JobData,
  MemoryThresholds,
  MetricData,
  OverallHealthStatus,
  ServiceHealthStatus,
  SystemHealth
} from '../utils/types';
import { alertValidationService } from './alertValidation.service';
import { metricValidationService, type MetricAggregation } from './metricValidation.service';

const DEFAULT_MAX_METRIC_LIMIT = 1000;
const MAX_IDENTIFIER_LENGTH = 128;

const VALID_OVERALL_STATUS: readonly OverallHealthStatus[] = ['healthy', 'degraded', 'unhealthy'];
const VALID_SERVICE_STATUS: readonly ServiceHealthStatus[] = ['up', 'down', 'degraded'];

export interface MetricQueryOptions {
  name?: string;
  startTime?: Date | string | number;
  endTime?: Date | string | number;
  limit?: number;
  aggregation?: string;
}

export interface MetricQueryConfig {
  defaultLimit?: number;
  maxLimit?: number;
}

export interface NormalizedMetricQueryOptions {
  name?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  aggregation?: MetricAggregation;
}

export class ObservabilityValidationService {
  /**
   * Normalize metric query parameters for dashboards and APIs.
   */
  normalizeMetricQuery(
    options: MetricQueryOptions = {},
    config: MetricQueryConfig = {}
  ): NormalizedMetricQueryOptions {
    const normalized: NormalizedMetricQueryOptions = {};

    if (options.name) {
      normalized.name = metricValidationService.ensureMetricName(options.name);
    }

    const { startTime, endTime } = this.ensureTimeRange(options.startTime, options.endTime);
    normalized.startTime = startTime;
    normalized.endTime = endTime;

    const maxLimit = config.maxLimit ?? DEFAULT_MAX_METRIC_LIMIT;
    let limitCandidate = options.limit;
    if (limitCandidate === undefined && config.defaultLimit !== undefined) {
      limitCandidate = config.defaultLimit;
    }
    normalized.limit = metricValidationService.ensureLimit(limitCandidate, maxLimit);

    if (options.aggregation) {
      normalized.aggregation = metricValidationService.ensureAggregation(options.aggregation);
    }

    return normalized;
  }

  /**
   * Ensure a time range is valid, allowing optional start or end values.
   */
  ensureTimeRange(
    start?: Date | string | number,
    end?: Date | string | number
  ): { startTime?: Date; endTime?: Date } {
    const startDate = this.ensureDate(start, 'startTime');
    const endDate = this.ensureDate(end, 'endTime');

    if (startDate && endDate && startDate > endDate) {
      throw createAppError('startTime must be earlier than endTime', 400, 'OBSERVABILITY_INVALID_TIME_RANGE');
    }

    return { startTime: startDate, endTime: endDate };
  }

  /**
   * Validate a metric payload.
   */
  validateMetric(metric: Omit<MetricData, 'timestamp'>): Omit<MetricData, 'timestamp'> {
    return metricValidationService.validateMetric(metric);
  }

  /**
   * Validate a metric batch payload.
   */
  validateMetricBatch(metrics: Array<Omit<MetricData, 'timestamp'>>): Array<Omit<MetricData, 'timestamp'>> {
    return metricValidationService.validateMetricBatch(metrics);
  }

  /**
   * Validate an alert rule payload.
   */
  validateAlertRule(rule: AlertRule): AlertRule {
    return alertValidationService.validateAlertRule(rule);
  }

  /**
   * Validate an alert instance.
   */
  validateAlert(alert: Alert): Alert {
    return alertValidationService.validateAlert(alert);
  }

  /**
   * Validate configurable memory thresholds before applying them.
   */
  validateMemoryThresholds(thresholds: Partial<MemoryThresholds>): Partial<MemoryThresholds> {
    if (!thresholds || typeof thresholds !== 'object') {
      throw createAppError('Memory thresholds must be provided as an object', 400, 'OBSERVABILITY_INVALID_THRESHOLDS');
    }

    const normalized: Partial<MemoryThresholds> = {};

    if (thresholds.warning !== undefined) {
      normalized.warning = this.ensurePositiveNumber(thresholds.warning, 'thresholds.warning');
    }

    if (thresholds.critical !== undefined) {
      normalized.critical = this.ensurePositiveNumber(thresholds.critical, 'thresholds.critical');
    }

    if (thresholds.maxHeapUsage !== undefined) {
      normalized.maxHeapUsage = this.ensurePercentage(thresholds.maxHeapUsage, 'thresholds.maxHeapUsage');
    }

    if (thresholds.gcHint !== undefined) {
      normalized.gcHint = this.ensurePositiveNumber(thresholds.gcHint, 'thresholds.gcHint');
    }

    if (
      normalized.warning !== undefined &&
      normalized.critical !== undefined &&
      normalized.warning >= normalized.critical
    ) {
      throw createAppError('Warning threshold must be lower than critical threshold', 400, 'OBSERVABILITY_INVALID_THRESHOLD_ORDER');
    }

    if (
      normalized.gcHint !== undefined &&
      normalized.warning !== undefined &&
      normalized.gcHint > normalized.warning
    ) {
      throw createAppError('GC hint threshold must not exceed warning threshold', 400, 'OBSERVABILITY_INVALID_GC_THRESHOLD');
    }

    return normalized;
  }

  /**
   * Validate job queue payloads before enqueueing work.
   */
  validateJobData(jobData: JobData, allowedTypes?: readonly string[]): JobData {
    if (!jobData || typeof jobData !== 'object') {
      throw createAppError('Job data must be provided as an object', 400, 'OBSERVABILITY_INVALID_JOB_DATA');
    }

    const type = this.ensureServiceName(jobData.type, 'jobData.type');

    if (allowedTypes && !allowedTypes.includes(type)) {
      throw createAppError(`Unsupported job type: ${type}`, 400, 'OBSERVABILITY_INVALID_JOB_TYPE');
    }

    return {
      type,
      payload: jobData.payload,
      userId: this.ensureOptionalId(jobData.userId, 'jobData.userId'),
      businessId: this.ensureOptionalId(jobData.businessId, 'jobData.businessId'),
      priority: this.ensureOptionalInteger(jobData.priority, 'jobData.priority', -1000, 1000),
      delay: this.ensureOptionalInteger(jobData.delay, 'jobData.delay', 0, 7 * 24 * 60 * 60 * 1000),
      attempts: this.ensureOptionalInteger(jobData.attempts, 'jobData.attempts', 1, 100)
    };
  }

  /**
   * Validate a system health snapshot before exposing it publicly.
   */
  validateSystemHealth(health: SystemHealth): SystemHealth {
    if (!health || typeof health !== 'object') {
      throw createAppError('System health payload must be an object', 400, 'OBSERVABILITY_INVALID_SYSTEM_HEALTH');
    }

    const status = this.ensureOverallStatus(health.status);
    const timestamp = this.ensureDate(health.timestamp, 'timestamp');
    const services = this.ensureServiceStatuses(health.services);
    const metrics = this.ensureMetricSnapshot(health.metrics);
    const alerts = Array.isArray(health.alerts)
      ? health.alerts.map(alert => alertValidationService.validateAlert(alert))
      : [];

    return {
      status,
      timestamp,
      services,
      metrics,
      alerts
    };
  }

  /**
   * Ensure service identifiers are non-empty strings.
   */
  ensureServiceName(name: string, fieldName: string = 'serviceName'): string {
    if (typeof name !== 'string') {
      throw createAppError(`${fieldName} must be a string`, 400, 'OBSERVABILITY_INVALID_SERVICE_NAME');
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw createAppError(`${fieldName} is required`, 400, 'OBSERVABILITY_MISSING_SERVICE_NAME');
    }

    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw createAppError(`${fieldName} cannot exceed ${MAX_IDENTIFIER_LENGTH} characters`, 400, 'OBSERVABILITY_SERVICE_NAME_TOO_LONG');
    }

    return trimmed;
  }

  private ensureDate(value: Date | string | number | undefined, fieldName: string): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw createAppError(`${fieldName} must be a valid Date`, 400, 'OBSERVABILITY_INVALID_DATE');
      }
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw createAppError(`${fieldName} must be a valid Date`, 400, 'OBSERVABILITY_INVALID_DATE');
    }

    return parsed;
  }

  private ensurePositiveNumber(value: number, fieldName: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
      throw createAppError(`${fieldName} must be a positive number`, 400, 'OBSERVABILITY_INVALID_NUMBER');
    }

    return value;
  }

  private ensurePercentage(value: number, fieldName: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw createAppError(`${fieldName} must be a number`, 400, 'OBSERVABILITY_INVALID_PERCENTAGE');
    }

    if (value <= 0 || value > 100) {
      throw createAppError(`${fieldName} must be between 0 and 100`, 400, 'OBSERVABILITY_INVALID_PERCENTAGE_RANGE');
    }

    return value;
  }

  private ensureOptionalId(value: string | undefined, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw createAppError(`${fieldName} must be a string`, 400, 'OBSERVABILITY_INVALID_IDENTIFIER');
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw createAppError(`${fieldName} cannot exceed ${MAX_IDENTIFIER_LENGTH} characters`, 400, 'OBSERVABILITY_IDENTIFIER_TOO_LONG');
    }

    return trimmed;
  }

  private ensureOptionalInteger(
    value: number | undefined,
    fieldName: string,
    min: number,
    max: number
  ): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (!Number.isInteger(value)) {
      throw createAppError(`${fieldName} must be an integer`, 400, 'OBSERVABILITY_INVALID_INTEGER');
    }

    if (value < min || value > max) {
      throw createAppError(`${fieldName} must be between ${min} and ${max}`, 400, 'OBSERVABILITY_INTEGER_OUT_OF_RANGE');
    }

    return value;
  }

  private ensureOverallStatus(status: OverallHealthStatus): OverallHealthStatus {
    if (!VALID_OVERALL_STATUS.includes(status)) {
      throw createAppError(`Unsupported overall status: ${status}`, 400, 'OBSERVABILITY_INVALID_OVERALL_STATUS');
    }

    return status;
  }

  private ensureServiceStatuses(services: SystemHealth['services']): SystemHealth['services'] {
    if (!services || typeof services !== 'object') {
      throw createAppError('Service status payload must be an object', 400, 'OBSERVABILITY_INVALID_SERVICE_STATUS');
    }

    return {
      database: this.ensureServiceStatus(services.database, 'services.database'),
      cache: this.ensureServiceStatus(services.cache, 'services.cache'),
      storage: this.ensureServiceStatus(services.storage, 'services.storage'),
      external: this.ensureServiceStatus(services.external, 'services.external')
    };
  }

  private ensureServiceStatus(status: ServiceHealthStatus, fieldName: string): ServiceHealthStatus {
    if (!VALID_SERVICE_STATUS.includes(status)) {
      throw createAppError(`Unsupported service status for ${fieldName}: ${status}`, 400, 'OBSERVABILITY_INVALID_SERVICE_STATE');
    }

    return status;
  }

  private ensureMetricSnapshot(metrics: SystemHealth['metrics']): SystemHealth['metrics'] {
    if (!metrics || typeof metrics !== 'object') {
      throw createAppError('System metrics payload must be an object', 400, 'OBSERVABILITY_INVALID_METRICS');
    }

    return {
      cpu: this.ensureNonNegativeNumber(metrics.cpu, 'metrics.cpu'),
      memory: this.ensureNonNegativeNumber(metrics.memory, 'metrics.memory'),
      disk: this.ensureNonNegativeNumber(metrics.disk, 'metrics.disk'),
      responseTime: this.ensureNonNegativeNumber(metrics.responseTime, 'metrics.responseTime'),
      errorRate: this.ensureNonNegativeNumber(metrics.errorRate, 'metrics.errorRate')
    };
  }

  private ensureNonNegativeNumber(value: number, fieldName: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
      throw createAppError(`${fieldName} must be a non-negative number`, 400, 'OBSERVABILITY_INVALID_MEASUREMENT');
    }

    return value;
  }
}

export const observabilityValidationService = new ObservabilityValidationService();
