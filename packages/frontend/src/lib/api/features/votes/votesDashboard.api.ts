// src/lib/api/features/votes/votesDashboard.api.ts
// Voting dashboard API aligned with backend routes/features/votes/votesDashboard.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { VotingDashboardData, VotingHealthStatus } from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeObjectId } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/dashboard';

type HttpMethod = 'GET' | 'POST';

const createVotesDashboardLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'dashboard',
  method,
  endpoint,
  ...context
});

const sanitizeBusinessQuery = (businessId: string) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
  return {
    params: baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId }),
    businessId: sanitizedBusinessId
  };
};

export interface VotingDashboardResponse {
  businessId: string;
  dashboard: VotingDashboardData;
}

export interface ClearVotingCachesResponse {
  businessId: string;
  cleared: boolean;
  clearedAt: string;
}

export interface VotingServiceHealthResponse {
  health: VotingHealthStatus;
  checkedAt: string;
}

export const votesDashboardApi = {
  /**
   * Retrieve voting dashboard data for a business.
   * GET /api/votes/dashboard
   */
  async getVotingDashboard(businessId: string): Promise<VotingDashboardResponse> {
    const endpoint = BASE_PATH;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessQuery(businessId);

    try {
      const response = await api.get<ApiResponse<VotingDashboardResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting dashboard', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDashboardLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Clear cached voting data for a business.
   * POST /api/votes/dashboard/clear-caches
   */
  async clearVotingCaches(businessId: string): Promise<ClearVotingCachesResponse> {
    const endpoint = `${BASE_PATH}/clear-caches`;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessQuery(businessId);

    try {
      const response = await api.post<ApiResponse<ClearVotingCachesResponse>>(endpoint, undefined, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to clear voting caches', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDashboardLogContext('POST', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Retrieve voting service health.
   * GET /api/votes/dashboard/health
   */
  async getVotingServiceHealth(): Promise<VotingServiceHealthResponse> {
    const endpoint = `${BASE_PATH}/health`;

    try {
      const response = await api.get<ApiResponse<VotingServiceHealthResponse>>(endpoint);
      return baseApi.handleResponse(response, 'Failed to fetch voting service health', 500);
    } catch (error) {
      throw handleApiError(error, createVotesDashboardLogContext('GET', endpoint));
    }
  }
};

export default votesDashboardApi;
