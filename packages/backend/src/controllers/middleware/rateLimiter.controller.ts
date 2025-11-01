// src/controllers/middleware/rateLimiter.controller.ts
// Controller exposing rate limiter administration endpoints

import { Response } from 'express';
import { MiddlewareBaseController, MiddlewareBaseRequest } from './middlewareBase.controller';

interface RateLimiterConfigRequest extends MiddlewareBaseRequest {
  validatedParams?: {
    key?: string;
  };
  validatedBody?: {
    windowSizeMs?: number;
    maxRequests?: number;
  };
}

/**
 * RateLimiterController provides administrative access to sliding window limiter configuration.
 */
export class RateLimiterController extends MiddlewareBaseController {
  /**
   * Retrieve overall limiter statistics and current configuration.
   */
  async getLimiterStats(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_GET_LIMITER_STATS');

      const stats = this.slidingWindowRateLimiter.getStats();
      const configs = Object.entries(this.slidingWindowConfigs).reduce<Record<string, { windowSizeMs: number; maxRequests: number }>>(
        (acc, [key, value]) => {
          acc[key] = {
            windowSizeMs: value.windowSizeMs,
            maxRequests: value.maxRequests
          };
          return acc;
        },
        {}
      );

      this.logAction(req, 'MIDDLEWARE_GET_LIMITER_STATS_SUCCESS', {
        limiterKeys: Object.keys(configs),
        blockedRequests: stats.blockedRequests
      });

      return {
        stats,
        configs
      };
    }, res, 'Rate limiter statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve configuration for a specific limiter key.
   */
  async getLimiterConfig(req: RateLimiterConfigRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_GET_LIMITER_CONFIG');

      const key =
        this.parseString(req.validatedParams?.key) ??
        this.parseString((req.params as any)?.key);

      if (!key) {
        throw { statusCode: 400, message: 'Limiter key is required' };
      }

      const config = this.slidingWindowConfigs[key];
      if (!config) {
        throw { statusCode: 404, message: `Limiter configuration not found for key "${key}"` };
      }

      this.logAction(req, 'MIDDLEWARE_GET_LIMITER_CONFIG_SUCCESS', { key });

      return {
        key,
        config: {
          windowSizeMs: config.windowSizeMs,
          maxRequests: config.maxRequests
        }
      };
    }, res, 'Rate limiter configuration retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update window size or max requests for a limiter key.
   */
  async updateLimiterConfig(req: RateLimiterConfigRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_UPDATE_LIMITER_CONFIG');

      const key =
        this.parseString(req.validatedParams?.key) ??
        this.parseString((req.params as any)?.key);

      if (!key) {
        throw { statusCode: 400, message: 'Limiter key is required' };
      }

      const config = this.slidingWindowConfigs[key];
      if (!config) {
        throw { statusCode: 404, message: `Limiter configuration not found for key "${key}"` };
      }

      const body = this.sanitizeInput(req.validatedBody ?? (req.body as Record<string, unknown>) ?? {});

      const windowSizeMs = this.parseOptionalNumber(body.windowSizeMs, { min: 1000 });
      const maxRequests = this.parseOptionalNumber(body.maxRequests, { min: 1 });

      if (windowSizeMs === undefined && maxRequests === undefined) {
        throw { statusCode: 400, message: 'At least one of windowSizeMs or maxRequests must be provided' };
      }

      if (windowSizeMs !== undefined) {
        config.windowSizeMs = windowSizeMs;
      }

      if (maxRequests !== undefined) {
        config.maxRequests = maxRequests;
      }

      this.logAction(req, 'MIDDLEWARE_UPDATE_LIMITER_CONFIG_SUCCESS', {
        key,
        windowSizeMs: config.windowSizeMs,
        maxRequests: config.maxRequests
      });

      return {
        key,
        updated: true,
        config: {
          windowSizeMs: config.windowSizeMs,
          maxRequests: config.maxRequests
        }
      };
    }, res, 'Rate limiter configuration updated successfully', this.getRequestMeta(req));
  }
}

export const rateLimiterController = new RateLimiterController();

