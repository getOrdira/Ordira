// src/controllers/features/apiKey/apiKeyUsage.controller.ts
// Controller exposing API key usage tracking operations

import { Response } from 'express';
import { ApiKeyBaseController, ApiKeyBaseRequest } from './apiKeyBase.controller';

interface CheckRateLimitRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
  };
  validatedQuery?: {
    hourlyLimit?: number;
  };
}

interface GetUsageStatsRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
  };
  validatedQuery?: {
    timeframe?: string;
  };
}

interface GetDetailedUsageStatsRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
  };
  validatedQuery?: {
    startDate?: string;
    endDate?: string;
  };
}

interface LogUsageRequest extends ApiKeyBaseRequest {
  validatedParams?: {
    keyId?: string;
  };
  validatedBody?: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * ApiKeyUsageController maps HTTP requests to the API key usage service.
 */
export class ApiKeyUsageController extends ApiKeyBaseController {
  /**
   * Check rate limit status for an API key.
   * GET /api/api-keys/:keyId/rate-limit
   */
  async checkRateLimit(req: CheckRateLimitRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_CHECK_RATE_LIMIT');

      const keyId = this.requireKeyId(req);
      const hourlyLimit = this.parseNumber(
        req.validatedQuery?.hourlyLimit ?? (req.query as any)?.hourlyLimit,
        1000,
        { min: 1 }
      );

      const rateLimit = await this.apiKeyUsageService.checkRateLimit(keyId, hourlyLimit);

      this.logAction(req, 'API_KEY_CHECK_RATE_LIMIT_SUCCESS', {
        keyId,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining
      });

      return rateLimit;
    }, res, 'Rate limit status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get usage statistics for an API key.
   * GET /api/api-keys/:keyId/usage
   */
  async getKeyUsageStats(req: GetUsageStatsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_USAGE_STATS');

      const keyId = this.requireKeyId(req);
      const timeframe = this.parseString(
        req.validatedQuery?.timeframe ?? (req.query as any)?.timeframe
      ) || '30d';

      const stats = await this.apiKeyUsageService.getKeyUsageStats(keyId, timeframe);

      this.logAction(req, 'API_KEY_GET_USAGE_STATS_SUCCESS', {
        keyId,
        timeframe
      });

      return stats;
    }, res, 'Usage statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get detailed usage statistics for an API key.
   * GET /api/api-keys/:keyId/usage/detailed
   */
  async getDetailedUsageStats(req: GetDetailedUsageStatsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_DETAILED_USAGE_STATS');

      const keyId = this.requireKeyId(req);
      const startDate = this.parseDate(
        req.validatedQuery?.startDate ?? (req.query as any)?.startDate
      );
      const endDate = this.parseDate(
        req.validatedQuery?.endDate ?? (req.query as any)?.endDate
      );

      const options: any = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const stats = await this.apiKeyUsageService.getDetailedUsageStats(keyId, options);

      this.logAction(req, 'API_KEY_GET_DETAILED_USAGE_STATS_SUCCESS', {
        keyId
      });

      return stats;
    }, res, 'Detailed usage statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get enhanced usage statistics for an API key.
   * GET /api/api-keys/:keyId/usage/enhanced
   */
  async getEnhancedUsageStats(req: GetUsageStatsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_GET_ENHANCED_USAGE_STATS');

      const keyId = this.requireKeyId(req);
      const timeframe = this.parseString(
        req.validatedQuery?.timeframe ?? (req.query as any)?.timeframe
      ) || '30d';

      const stats = await this.apiKeyUsageService.getEnhancedUsageStats(keyId, timeframe);

      this.logAction(req, 'API_KEY_GET_ENHANCED_USAGE_STATS_SUCCESS', {
        keyId,
        timeframe
      });

      return stats;
    }, res, 'Enhanced usage statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Log API key usage.
   * POST /api/api-keys/:keyId/usage/log
   */
  async logUsage(req: LogUsageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'API_KEY_LOG_USAGE');

      const keyId = this.requireKeyId(req);
      const usageData = {
        endpoint: req.validatedBody?.endpoint ?? (req.body as any)?.endpoint,
        method: req.validatedBody?.method ?? (req.body as any)?.method,
        statusCode: req.validatedBody?.statusCode ?? (req.body as any)?.statusCode,
        responseTime: req.validatedBody?.responseTime ?? (req.body as any)?.responseTime,
        ipAddress: req.validatedBody?.ipAddress ?? (req.body as any)?.ipAddress,
        userAgent: req.validatedBody?.userAgent ?? (req.body as any)?.userAgent,
        timestamp: new Date()
      };

      await this.apiKeyUsageService.logUsage(keyId, usageData);

      this.logAction(req, 'API_KEY_LOG_USAGE_SUCCESS', {
        keyId
      });

      return { success: true, message: 'Usage logged successfully' };
    }, res, 'Usage logged successfully', this.getRequestMeta(req));
  }
}

export const apiKeyUsageController = new ApiKeyUsageController();

