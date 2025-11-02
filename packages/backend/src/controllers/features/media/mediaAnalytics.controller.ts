// src/controllers/features/media/mediaAnalytics.controller.ts
// Controller for media analytics operations

import { Response, NextFunction } from 'express';
import { MediaBaseController, MediaBaseRequest } from './mediaBase.controller';

interface GetStorageStatsRequest extends MediaBaseRequest {
  // No additional query params needed
}

interface GetCategoryStatsRequest extends MediaBaseRequest {
  validatedQuery: {
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  };
}

interface GetUsageTrendsRequest extends MediaBaseRequest {
  validatedQuery?: {
    days?: number;
  };
}

/**
 * MediaAnalyticsController exposes analytics operations aligned with media analytics service.
 */
export class MediaAnalyticsController extends MediaBaseController {
  /**
   * Get comprehensive storage statistics
   */
  async getStorageStatistics(
    req: GetStorageStatsRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      this.recordPerformance(req, 'GET_STORAGE_STATISTICS');

      const stats = await this.mediaServices.analytics.getStorageStatistics(uploaderId);

      this.logAction(req, 'GET_STORAGE_STATISTICS_SUCCESS', {
        uploaderId,
        totalFiles: stats.totalFiles,
        totalSize: stats.storageUsed,
      });

      return { stats };
    }, res, 'Storage statistics retrieved', this.getRequestMeta(req));
  }

  /**
   * Get statistics by category
   */
  async getCategoryStatistics(
    req: GetCategoryStatsRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const category = req.validatedQuery.category;

      this.recordPerformance(req, 'GET_CATEGORY_STATISTICS');

      const stats = await this.mediaServices.analytics.getCategoryStatistics(uploaderId, category);

      this.logAction(req, 'GET_CATEGORY_STATISTICS_SUCCESS', {
        uploaderId,
        category,
        totalFiles: stats.totalFiles,
      });

      return { stats };
    }, res, 'Category statistics retrieved', this.getRequestMeta(req));
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    req: GetUsageTrendsRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const uploaderId = this.resolveUploaderId(req);
      this.ensureUploaderId(uploaderId);

      const days = this.parseNumber(req.validatedQuery?.days, 30, { min: 1, max: 365 });

      this.recordPerformance(req, 'GET_USAGE_TRENDS');

      const trends = await this.mediaServices.analytics.getUsageTrends(uploaderId, days);

      this.logAction(req, 'GET_USAGE_TRENDS_SUCCESS', {
        uploaderId,
        days,
        totalUploads: trends.totalUploads,
      });

      return { trends };
    }, res, 'Usage trends retrieved', this.getRequestMeta(req));
  }
}

export const mediaAnalyticsController = new MediaAnalyticsController();

