// src/lib/api/features/votes/votesAnalytics.api.ts
// Voting analytics API aligned with backend routes/features/votes/votesAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { VotingAnalytics } from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalObjectId,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/analytics';

type HttpMethod = 'GET';

const createVotesAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

export interface VotingAnalyticsQuery {
  businessId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  includeRecommendations?: boolean;
  includeTrends?: boolean;
  useCache?: boolean;
  proposalId?: string;
}

export interface VotingAnalyticsResponse {
  businessId: string;
  analytics: VotingAnalytics;
  generatedAt: string;
}

const sanitizeVotingAnalyticsQuery = (query?: VotingAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  const start = sanitizeOptionalDate(query.startDate, 'startDate');
  const end = sanitizeOptionalDate(query.endDate, 'endDate');

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
    includeRecommendations: sanitizeOptionalBoolean(query.includeRecommendations, 'includeRecommendations', {
      defaultValue: true
    }),
    includeTrends: sanitizeOptionalBoolean(query.includeTrends, 'includeTrends', {
      defaultValue: true
    }),
    useCache: sanitizeOptionalBoolean(query.useCache, 'useCache', {
      defaultValue: true
    }),
    proposalId: sanitizeOptionalString(query.proposalId, 'proposalId', {
      maxLength: 200,
      trim: true
    })
  });
};

export const votesAnalyticsApi = {
  /**
   * Retrieve voting analytics for a business.
   * GET /api/votes/analytics
   */
  async getVotingAnalytics(query?: VotingAnalyticsQuery): Promise<VotingAnalyticsResponse> {
    const endpoint = BASE_PATH;
    const params = sanitizeVotingAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<VotingAnalyticsResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting analytics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesAnalyticsLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  }
};

export default votesAnalyticsApi;
