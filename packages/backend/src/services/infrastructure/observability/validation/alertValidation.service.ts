import { createAppError } from '../../../../middleware/core/error.middleware';
import type { Alert, AlertCondition, AlertRule, AlertSeverity } from '../utils/types';
import { metricValidationService } from './metricValidation.service';

const VALID_CONDITIONS = ['gt', 'lt', 'eq', 'gte', 'lte'] as const;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_RULE_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 512;
const MAX_METADATA_ENTRIES = 20;
const MAX_METADATA_KEY_LENGTH = 64;

type Condition = typeof VALID_CONDITIONS[number];
type Severity = typeof VALID_SEVERITIES[number];

type MetadataRecord = Record<string, unknown>;

export class AlertValidationService {
  /**
   * Ensure an alert rule identifier is well-formed.
   */
  ensureRuleId(id: string): string {
    return this.ensureIdentifier(id, 'ruleId');
  }

  /**
   * Ensure an alert identifier is well-formed.
   */
  ensureAlertId(id: string): string {
    return this.ensureIdentifier(id, 'id');
  }

  /**
   * Ensure an alert rule name is provided and concise.
   */
  ensureRuleName(name: string): string {
    if (typeof name !== 'string') {
      throw createAppError('Alert rule name must be a string', 400, 'ALERT_RULE_INVALID_NAME_TYPE');
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw createAppError('Alert rule name is required', 400, 'ALERT_RULE_MISSING_NAME');
    }

    if (trimmed.length > MAX_RULE_NAME_LENGTH) {
      throw createAppError(`Alert rule name cannot exceed ${MAX_RULE_NAME_LENGTH} characters`, 400, 'ALERT_RULE_NAME_TOO_LONG');
    }

    return trimmed;
  }

  /**
   * Ensure an alert condition is supported.
   */
  ensureCondition(condition: AlertCondition): Condition {
    if (!VALID_CONDITIONS.includes(condition as Condition)) {
      throw createAppError(`Unsupported alert condition: ${condition}`, 400, 'ALERT_RULE_INVALID_CONDITION');
    }

    return condition as Condition;
  }

  /**
   * Ensure an alert threshold is a finite number.
   */
  ensureThreshold(threshold: number): number {
    if (typeof threshold !== 'number' || Number.isNaN(threshold) || !Number.isFinite(threshold)) {
      throw createAppError('Alert threshold must be a finite number', 400, 'ALERT_RULE_INVALID_THRESHOLD');
    }

    return threshold;
  }

  /**
   * Ensure an alert rule evaluation window is a positive number of milliseconds.
   */
  ensureDuration(duration: number): number {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw createAppError('Alert rule duration must be a positive number of milliseconds', 400, 'ALERT_RULE_INVALID_DURATION');
    }

    return Math.floor(duration);
  }

  /**
   * Ensure an alert severity is supported.
   */
  ensureSeverity(severity: AlertSeverity): Severity {
    if (!VALID_SEVERITIES.includes(severity as Severity)) {
      throw createAppError(`Unsupported alert severity: ${severity}`, 400, 'ALERT_RULE_INVALID_SEVERITY');
    }

    return severity as Severity;
  }

  /**
   * Ensure the enabled flag defaults to true when omitted.
   */
  ensureEnabled(enabled?: boolean): boolean {
    if (enabled === undefined || enabled === null) {
      return true;
    }

    if (typeof enabled !== 'boolean') {
      throw createAppError('Alert enabled flag must be a boolean', 400, 'ALERT_RULE_INVALID_ENABLED');
    }

    return enabled;
  }

  /**
   * Ensure an alert message is user-friendly and concise.
   */
  ensureAlertMessage(message: string): string {
    if (typeof message !== 'string') {
      throw createAppError('Alert message must be a string', 400, 'ALERT_INVALID_MESSAGE_TYPE');
    }

    const trimmed = message.trim();
    if (!trimmed) {
      throw createAppError('Alert message is required', 400, 'ALERT_MISSING_MESSAGE');
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw createAppError(`Alert message cannot exceed ${MAX_MESSAGE_LENGTH} characters`, 400, 'ALERT_MESSAGE_TOO_LONG');
    }

    return trimmed;
  }

  /**
   * Ensure alert metadata is a small key-value object.
   */
  ensureMetadata(metadata?: MetadataRecord): MetadataRecord | undefined {
    if (metadata === undefined || metadata === null) {
      return undefined;
    }

    if (!this.isPlainObject(metadata)) {
      throw createAppError('Alert metadata must be an object', 400, 'ALERT_INVALID_METADATA');
    }

    const entries = Object.entries(metadata);
    if (entries.length > MAX_METADATA_ENTRIES) {
      throw createAppError(`Alert metadata cannot contain more than ${MAX_METADATA_ENTRIES} entries`, 400, 'ALERT_METADATA_TOO_LARGE');
    }

    const sanitized: MetadataRecord = {};

    for (const [rawKey, value] of entries) {
      const key = rawKey.trim();
      if (!key) {
        throw createAppError('Alert metadata keys must be non-empty strings', 400, 'ALERT_INVALID_METADATA_KEY');
      }

      if (key.length > MAX_METADATA_KEY_LENGTH) {
        throw createAppError(`Alert metadata keys cannot exceed ${MAX_METADATA_KEY_LENGTH} characters`, 400, 'ALERT_METADATA_KEY_TOO_LONG');
      }

      if (value === undefined) {
        continue;
      }

      if (typeof value === 'function') {
        throw createAppError('Alert metadata values cannot be functions', 400, 'ALERT_INVALID_METADATA_VALUE');
      }

      sanitized[key] = value;
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Ensure alert timestamps are valid Date instances.
   */
  ensureTimestamp(timestamp: Date): Date {
    if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
      throw createAppError('Alert timestamp must be a valid Date', 400, 'ALERT_INVALID_TIMESTAMP');
    }

    return timestamp;
  }

  /**
   * Ensure optional resolution timestamps are valid when provided.
   */
  ensureOptionalTimestamp(timestamp?: Date): Date | undefined {
    if (timestamp === undefined || timestamp === null) {
      return undefined;
    }

    return this.ensureTimestamp(timestamp);
  }

  /**
   * Validate an alert rule payload.
   */
  validateAlertRule(rule: AlertRule): AlertRule {
    return {
      id: this.ensureRuleId(rule.id),
      name: this.ensureRuleName(rule.name),
      metric: metricValidationService.ensureMetricName(rule.metric),
      condition: this.ensureCondition(rule.condition),
      threshold: this.ensureThreshold(rule.threshold),
      duration: this.ensureDuration(rule.duration),
      severity: this.ensureSeverity(rule.severity),
      enabled: this.ensureEnabled(rule.enabled)
    };
  }

  /**
   * Validate an alert instance.
   */
  validateAlert(alert: Alert): Alert {
    return {
      id: this.ensureAlertId(alert.id),
      ruleId: this.ensureRuleId(alert.ruleId),
      message: this.ensureAlertMessage(alert.message),
      severity: this.ensureSeverity(alert.severity),
      timestamp: this.ensureTimestamp(alert.timestamp),
      resolved: this.ensureOptionalTimestamp(alert.resolved),
      metadata: this.ensureMetadata(alert.metadata)
    };
  }

  private ensureIdentifier(id: string, fieldName: string): string {
    if (typeof id !== 'string') {
      throw createAppError(`Alert ${fieldName} must be a string`, 400, 'ALERT_INVALID_IDENTIFIER_TYPE');
    }

    const trimmed = id.trim();
    if (!trimmed) {
      throw createAppError(`Alert ${fieldName} is required`, 400, 'ALERT_MISSING_IDENTIFIER');
    }

    if (trimmed.length > MAX_IDENTIFIER_LENGTH) {
      throw createAppError(`Alert ${fieldName} cannot exceed ${MAX_IDENTIFIER_LENGTH} characters`, 400, 'ALERT_IDENTIFIER_TOO_LONG');
    }

    return trimmed;
  }

  private isPlainObject(value: unknown): value is MetadataRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

export const alertValidationService = new AlertValidationService();
