// src/lib/api/features/votes/votesStats.api.ts
// Voting statistics API aligned with backend routes/features/votes/votesStats.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { VotingStats } from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeObjectId, sanitizeOptionalBoolean } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/stats';

type HttpMethod = 'GET';

const createVotesStatsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'stats',
  method,
  endpoint,
  ...context
});

export interface VotingStatsQuery {
  useCache?: boolean;
}

export interface VotingStatsResponse {
  businessId: string;
  stats: VotingStats;
}

export const votesStatsApi = {
  /**
   * Retrieve aggregated voting statistics for a business.
   * GET /api/votes/stats
   */
  async getVotingStats(businessId: string, query?: VotingStatsQuery): Promise<VotingStatsResponse> {
    const endpoint = BASE_PATH;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({
      businessId: sanitizedBusinessId,
      useCache: sanitizeOptionalBoolean(query?.useCache, 'useCache', { defaultValue: true })
    });

    try {
      const response = await api.get<ApiResponse<VotingStatsResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting statistics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesStatsLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId
        })
      );
    }
  }
};

export default votesStatsApi;
