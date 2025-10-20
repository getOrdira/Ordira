/**
 * Base error class for analytics domain.
 */
export class AnalyticsError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(message: string, statusCode: number = 500, code: string = 'ANALYTICS_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'AnalyticsError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validation error for invalid analytics inputs.
 */
export class AnalyticsValidationError extends AnalyticsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'ANALYTICS_VALIDATION_ERROR', details);
    this.name = 'AnalyticsValidationError';
  }
}

/**
 * Error thrown when expected analytics data is missing.
 */
export class AnalyticsDataNotFoundError extends AnalyticsError {
  constructor(message: string = 'Analytics data not found', details?: Record<string, unknown>) {
    super(message, 404, 'ANALYTICS_NOT_FOUND', details);
    this.name = 'AnalyticsDataNotFoundError';
  }
}

/**
 * Error used when long running analytics computations time out.
 */
export class AnalyticsTimeoutError extends AnalyticsError {
  constructor(message: string = 'Analytics computation timed out', details?: Record<string, unknown>) {
    super(message, 504, 'ANALYTICS_TIMEOUT', details);
    this.name = 'AnalyticsTimeoutError';
  }
}
