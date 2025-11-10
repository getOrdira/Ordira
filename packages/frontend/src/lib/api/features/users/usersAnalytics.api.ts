// src/lib/api/features/users/usersAnalytics.api.ts
// Users analytics API aligned with backend routes/features/users/usersAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UserAnalytics } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalEnum, sanitizeOptionalDate } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/users/analytics';

type HttpMethod = 'GET';

const createUsersAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

const ANALYTICS_RANGES = ['7d', '30d', '90d', '180d', '365d', '1y', 'all'] as const;

export type UserAnalyticsRange = typeof ANALYTICS_RANGES[number];

export interface UserAnalyticsQuery {
  range?: UserAnalyticsRange;
  start?: Date | string;
  end?: Date | string;
}

export interface UserAnalyticsResponse {
  analytics: UserAnalytics;
  generatedAt: string;
}

const sanitizeAnalyticsQuery = (query?: UserAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  const startDate = sanitizeOptionalDate(query.start, 'start');
  const endDate = sanitizeOptionalDate(query.end, 'end');

  return baseApi.sanitizeQueryParams({
    range: sanitizeOptionalEnum(query.range, 'range', ANALYTICS_RANGES),
    start: startDate ? startDate.toISOString() : undefined,
    end: endDate ? endDate.toISOString() : undefined
  });
};

export const usersAnalyticsApi = {
  /**
   * Retrieve aggregated user analytics.
   * GET /api/users/analytics
   */
  async getUserAnalytics(query?: UserAnalyticsQuery): Promise<UserAnalyticsResponse> {
    const endpoint = `${BASE_PATH}`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<UserAnalyticsResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch user analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersAnalyticsLogContext('GET', endpoint, {
          hasParams: Boolean(params)
        })
      );
    }
  }
};

export default usersAnalyticsApi;
