import { logger } from '../../../../utils/logger';
import type { EcommerceProvider } from './types';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EcommerceIntegrationErrorOptions {
  provider?: EcommerceProvider;
  businessId?: string;
  code?: string;
  statusCode?: number;
  severity?: ErrorSeverity;
  cause?: Error;
  details?: Record<string, unknown>;
}

/**
 * Rich error type used across ecommerce integrations to provide actionable telemetry.
 */
export class EcommerceIntegrationError extends Error {
  readonly provider?: EcommerceProvider;
  readonly businessId?: string;
  readonly code?: string;
  readonly statusCode: number;
  readonly severity: ErrorSeverity;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: EcommerceIntegrationErrorOptions = {}) {
    super(message);
    this.name = 'EcommerceIntegrationError';
    this.provider = options.provider;
    this.businessId = options.businessId;
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.severity = options.severity ?? 'medium';
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
      if (!('stack' in this) || !this.stack) {
        this.stack = options.cause.stack;
      }
    }

    // Log immediately to maintain observability; upstream callers can opt-in to suppress via severity.
    logger.error(message, {
      provider: this.provider,
      businessId: this.businessId,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      details: this.details
    }, options.cause);
  }
}

export const isEcommerceIntegrationError = (error: unknown): error is EcommerceIntegrationError =>
  error instanceof EcommerceIntegrationError;

