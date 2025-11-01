// src/controllers/middleware/middlewareBase.controller.ts
// Shared helpers for middleware admin controllers

import { BaseController, BaseRequest } from '../core/base.controller';
import {
  getSlidingWindowRateLimiter,
  getSlidingWindowConfigs
} from '../../services/container.service';
import {
  SlidingWindowRateLimiter,
  SlidingWindowConfig
} from '../../services/infrastructure/resilience/features/slidingWindowRateLimiter.service';
import { performanceService } from '../../services/external/performance.service';
import { securityValidationMiddleware } from '../../middleware/deprecated/security-validation.middleware';

/**
 * Base controller providing access to shared middleware services.
 */
export abstract class MiddlewareBaseController extends BaseController {
  protected slidingWindowRateLimiter: SlidingWindowRateLimiter = getSlidingWindowRateLimiter();
  protected slidingWindowConfigs: Record<string, SlidingWindowConfig> = getSlidingWindowConfigs();
  protected performanceService = performanceService;
  protected securityValidation = securityValidationMiddleware;

  /**
   * Parse string value or return undefined.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Parse boolean value with fallback.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalised = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) {
        return true;
      }
      if (['false', '0', 'no', 'n', 'off'].includes(normalised)) {
        return false;
      }
    }

    return fallback;
  }

  /**
   * Parse optional boolean returning undefined when not present.
   */
  protected parseOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return this.parseBoolean(value);
  }

  /**
   * Parse optional number with optional min/max bounds.
   */
  protected parseOptionalNumber(
    value: unknown,
    options: { min?: number; max?: number } = {}
  ): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }

    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }

    return parsed;
  }
}

export type MiddlewareBaseRequest = BaseRequest;

