import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { MediaStats, CategoryStats } from '@/lib/types/features/media';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalNumber,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/media/analytics';

type HttpMethod = 'GET';

const createMediaAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'media',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

const MEDIA_CATEGORIES = ['profile', 'product', 'banner', 'certificate', 'document'] as const;

export type MediaCategory = typeof MEDIA_CATEGORIES[number];

export interface MediaUsageTrendDay {
  date: string;
  uploads: number;
  totalSize: number;
}

export interface MediaUsageTrends {
  daily: MediaUsageTrendDay[];
  totalUploads: number;
  totalSize: number;
}

const sanitizeCategory = (category: string) =>
  sanitizeString(category, 'category', {
    allowedValues: MEDIA_CATEGORIES
  });

export const mediaAnalyticsApi = {
  /**
   * Retrieve comprehensive storage statistics for the authenticated uploader.
   * GET /api/media/analytics/storage
   */
  async getStorageStatistics(): Promise<MediaStats> {
    const endpoint = `${BASE_PATH}/storage`;
    try {
      const response = await api.get<ApiResponse<{ stats: MediaStats }>>(endpoint);
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch media storage statistics',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(error, createMediaAnalyticsLogContext('GET', endpoint));
    }
  },

  /**
   * Retrieve statistics for a specific media category.
   * GET /api/media/analytics/category
   */
  async getCategoryStatistics(category: MediaCategory): Promise<CategoryStats> {
    const endpoint = `${BASE_PATH}/category`;
    try {
      const response = await api.get<ApiResponse<{ stats: CategoryStats }>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          category: sanitizeCategory(category)
        })
      });
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch category statistics',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaAnalyticsLogContext('GET', endpoint, { category })
      );
    }
  },

  /**
   * Retrieve upload usage trends over time.
   * GET /api/media/analytics/trends
   */
  async getUsageTrends(options?: { days?: number }): Promise<MediaUsageTrends> {
    const endpoint = `${BASE_PATH}/trends`;
    try {
      const response = await api.get<ApiResponse<{ trends: MediaUsageTrends }>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          days: sanitizeOptionalNumber(options?.days, 'days', { min: 1, max: 365 })
        })
      });
      const { trends } = baseApi.handleResponse(
        response,
        'Failed to fetch media usage trends',
        500
      );
      return trends;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaAnalyticsLogContext('GET', endpoint, { days: options?.days })
      );
    }
  }
};

export default mediaAnalyticsApi;
