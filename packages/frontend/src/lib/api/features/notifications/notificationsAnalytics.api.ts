// src/lib/api/features/notifications/notificationsAnalytics.api.ts
// Notifications analytics API aligned with backend routes/features/notifications/notificationsAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { NotificationStats } from '@/lib/types/features/notifications';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/notifications/analytics';

type HttpMethod = 'GET';

const createNotificationsAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

export const notificationsAnalyticsApi = {
  /**
   * Retrieve notification statistics for the authenticated recipient.
   * GET /api/notifications/analytics/stats
   */
  async getStats(): Promise<NotificationStats> {
    const endpoint = `${BASE_PATH}/stats`;

    try {
      const response = await api.get<ApiResponse<{ stats: NotificationStats }>>(endpoint);
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch notification statistics',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsAnalyticsLogContext('GET', endpoint)
      );
    }
  }
};

export default notificationsAnalyticsApi;
