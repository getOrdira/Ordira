import { Media } from '../../../models/deprecated/media.model';
import { mediaCacheService } from '../utils/cache';
import { MediaStats, CategoryStats } from '../utils/types';
import { MediaError } from '../utils/errors';
import { CacheKeys, validateString, formatFileSize } from '../utils/helpers';
import { logger } from '../../../utils/logger';

/**
 * Media analytics service for storage statistics and insights
 */
export class MediaAnalyticsService {
  /**
   * Get comprehensive storage statistics
   */
  async getStorageStatistics(uploaderId: string): Promise<MediaStats> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      // Try cache first
      const cacheKey = CacheKeys.storageStats(uploaderId);
      const cached = await mediaCacheService.getAnalytics('media', { uploaderId });
      if (cached) {
        logger.info('Storage statistics served from cache', { uploaderId });
        return cached;
      }

      // Use optimized aggregation pipelines
      const [stats, typeStats, categoryStats, largestFileData] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' }
            }
          }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Media.findOne({ uploadedBy: uploaderId })
          .sort({ size: -1 })
          .select('filename size createdAt')
          .lean()
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;
      const averageSize = stats[0]?.averageSize || 0;

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat._id || 'unknown'] = stat.count;
      });

      const byCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        byCategory[stat._id || 'unknown'] = stat.count;
      });

      const mediaStats: MediaStats = {
        totalFiles,
        totalSize,
        byType,
        byCategory,
        storageUsed: formatFileSize(totalSize),
        averageFileSize: formatFileSize(averageSize),
        largestFile: largestFileData ? {
          filename: largestFileData.filename,
          size: formatFileSize(largestFileData.size),
          uploadDate: largestFileData.createdAt
        } : undefined
      };

      // Cache the result
      await mediaCacheService.setAnalytics('media', { uploaderId }, mediaStats);

      const processingTime = Date.now() - startTime;
      logger.info('Storage statistics generated', {
        uploaderId,
        totalFiles,
        totalSize,
        processingTime
      });

      return mediaStats;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get storage statistics', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get storage statistics: ${error.message}`, 500, 'STATS_ERROR');
    }
  }

  /**
   * Get statistics by category
   */
  async getCategoryStatistics(
    uploaderId: string,
    category: 'profile' | 'product' | 'banner' | 'certificate' | 'document'
  ): Promise<CategoryStats> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      const [stats, typeDistribution, mostRecent] = await Promise.all([
        Media.aggregate([
          { $match: { uploadedBy: uploaderId, category } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              averageSize: { $avg: '$size' }
            }
          }
        ]),
        Media.aggregate([
          { $match: { uploadedBy: uploaderId, category } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Media.findOne({ uploadedBy: uploaderId, category })
          .sort({ createdAt: -1 })
          .select('createdAt')
          .lean()
      ]);

      const totalFiles = stats[0]?.totalFiles || 0;
      const totalSize = stats[0]?.totalSize || 0;
      const averageSize = stats[0]?.averageSize || 0;

      const fileTypes: Record<string, number> = {};
      typeDistribution.forEach(stat => {
        fileTypes[stat._id || 'unknown'] = stat.count;
      });

      const categoryStats: CategoryStats = {
        category,
        totalFiles,
        totalSize: formatFileSize(totalSize),
        averageFileSize: formatFileSize(averageSize),
        mostRecentUpload: mostRecent?.createdAt,
        fileTypes
      };

      const processingTime = Date.now() - startTime;
      logger.info('Category statistics generated', {
        uploaderId,
        category,
        totalFiles,
        processingTime
      });

      return categoryStats;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get category statistics', {
        uploaderId,
        category,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get category statistics: ${error.message}`, 500, 'CATEGORY_STATS_ERROR');
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    uploaderId: string,
    days: number = 30
  ): Promise<{
    daily: Array<{ date: string; uploads: number; totalSize: number }>;
    totalUploads: number;
    totalSize: number;
  }> {
    const startTime = Date.now();

    try {
      const validation = validateString(uploaderId, 'Uploader ID');
      if (!validation.valid) {
        throw new MediaError(validation.error!, 400, 'MISSING_UPLOADER_ID');
      }

      const since = new Date();
      since.setDate(since.getDate() - days);

      const trends = await Media.aggregate([
        {
          $match: {
            uploadedBy: uploaderId,
            createdAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            uploads: { $sum: 1 },
            totalSize: { $sum: '$size' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const daily = trends.map(trend => ({
        date: trend._id,
        uploads: trend.uploads,
        totalSize: trend.totalSize
      }));

      const totalUploads = daily.reduce((sum, day) => sum + day.uploads, 0);
      const totalSize = daily.reduce((sum, day) => sum + day.totalSize, 0);

      const processingTime = Date.now() - startTime;
      logger.info('Usage trends generated', {
        uploaderId,
        days,
        totalUploads,
        processingTime
      });

      return { daily, totalUploads, totalSize };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get usage trends', {
        uploaderId,
        error: error.message,
        processingTime
      });

      if (error instanceof MediaError) {
        throw error;
      }
      throw new MediaError(`Failed to get usage trends: ${error.message}`, 500, 'TRENDS_ERROR');
    }
  }
}

export const mediaAnalyticsService = new MediaAnalyticsService();

