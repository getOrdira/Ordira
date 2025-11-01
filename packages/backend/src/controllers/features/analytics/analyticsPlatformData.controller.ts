// src/controllers/features/analytics/analyticsPlatformData.controller.ts
// Controller exposing platform analytics data operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';
import type { AnalyticsGrouping } from '../../../services/analytics/utils/types';

interface BusinessAnalyticsRequest extends AnalyticsBaseRequest {
  validatedQuery?: {
    industry?: string;
    plan?: string;
    verified?: boolean;
    startDate?: string;
    endDate?: string;
    useCache?: boolean;
  };
}

interface ProductAnalyticsRequest extends AnalyticsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    startDate?: string;
    endDate?: string;
    useCache?: boolean;
  };
}

interface ManufacturerAnalyticsRequest extends AnalyticsBaseRequest {
  validatedQuery?: {
    startDate?: string;
    endDate?: string;
    useCache?: boolean;
  };
}

interface VotingAnalyticsRequest extends AnalyticsBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    groupBy?: AnalyticsGrouping | string;
    startDate?: string;
    endDate?: string;
    useCache?: boolean;
  };
}

/**
 * AnalyticsPlatformDataController maps HTTP requests to platform analytics data services.
 */
export class AnalyticsPlatformDataController extends AnalyticsBaseController {
  /**
   * Retrieve business analytics snapshot with optional segmentation filters.
   */
  async getBusinessAnalytics(req: BusinessAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_BUSINESS_SNAPSHOT');

      const timeRange = this.extractTimeRange(req);
      const options = {
        industry:
          this.parseString(req.validatedQuery?.industry) ??
          this.parseString((req.query as any)?.industry),
        plan:
          this.parseString(req.validatedQuery?.plan) ??
          this.parseString((req.query as any)?.plan),
        verified:
          req.validatedQuery?.verified ??
          this.parseOptionalBoolean((req.query as any)?.verified),
        timeRange,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true
      };

      const snapshot = await this.platformAnalyticsDataService.getBusinessAnalytics(options);

      this.logAction(req, 'ANALYTICS_BUSINESS_SNAPSHOT_SUCCESS', {
        industry: options.industry,
        plan: options.plan,
        hasTimeRange: Boolean(timeRange),
        verified: options.verified
      });

      return {
        snapshot,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Business analytics snapshot retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve product analytics snapshot optionally scoped to a business or manufacturer.
   */
  async getProductAnalytics(req: ProductAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_PRODUCT_SNAPSHOT');

      const timeRange = this.extractTimeRange(req);
      const businessId = this.resolveBusinessId(req);
      const manufacturerId = this.resolveManufacturerId(req);

      const options = {
        businessId,
        manufacturerId,
        timeRange,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true
      };

      const snapshot = await this.platformAnalyticsDataService.getProductAnalytics(options);

      this.logAction(req, 'ANALYTICS_PRODUCT_SNAPSHOT_SUCCESS', {
        businessId,
        manufacturerId,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        snapshot,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Product analytics snapshot retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve manufacturer analytics snapshot for the requested time period.
   */
  async getManufacturerAnalytics(req: ManufacturerAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_MANUFACTURER_SNAPSHOT');

      const timeRange = this.extractTimeRange(req);
      const options = {
        timeRange,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true
      };

      const snapshot = await this.platformAnalyticsDataService.getManufacturerAnalytics(options);

      this.logAction(req, 'ANALYTICS_MANUFACTURER_SNAPSHOT_SUCCESS', {
        hasTimeRange: Boolean(timeRange)
      });

      return {
        snapshot,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Manufacturer analytics snapshot retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve platform-wide voting analytics.
   */
  async getPlatformVotingAnalytics(req: VotingAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_VOTING_PLATFORM');

      const timeRange = this.extractTimeRange(req);
      const groupBy = this.parseGrouping(
        req.validatedQuery?.groupBy ?? (req.query as any)?.groupBy
      );

      const analytics = await this.platformAnalyticsDataService.getPlatformVotingAnalytics({
        timeRange,
        groupBy,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true
      });

      this.logAction(req, 'ANALYTICS_VOTING_PLATFORM_SUCCESS', {
        groupBy,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        analytics,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Platform voting analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve business-scoped voting analytics with optional grouping.
   */
  async getBusinessVotingAnalytics(req: VotingAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_VOTING_BUSINESS');

      const businessId = this.resolveBusinessId(req, true) as string;
      const timeRange = this.extractTimeRange(req);
      const groupBy = this.parseGrouping(
        req.validatedQuery?.groupBy ?? (req.query as any)?.groupBy
      );

      const analytics = await this.platformAnalyticsDataService.getVotingAnalyticsForBusiness(
        businessId,
        {
          timeRange,
          groupBy,
          useCache:
            req.validatedQuery?.useCache ??
            this.parseOptionalBoolean((req.query as any)?.useCache) ??
            true
        }
      );

      this.logAction(req, 'ANALYTICS_VOTING_BUSINESS_SUCCESS', {
        businessId,
        groupBy,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        businessId,
        analytics,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Business voting analytics retrieved successfully', this.getRequestMeta(req));
  }
}

export const analyticsPlatformDataController = new AnalyticsPlatformDataController();

