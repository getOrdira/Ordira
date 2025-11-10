// src/lib/api/features/votes/votesData.api.ts
// Voting data API aligned with backend routes/features/votes/votesData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse, PaginationMeta } from '@/lib/types/core';
import type {
  BusinessVotesOptions,
  PendingVoteRecord,
  PendingVotesFilters,
  VoteRecord,
  VotingTrendSummary
} from '@/lib/types/features/votes';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/votes/data';

type HttpMethod = 'GET';

const createVotesDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'votes',
  module: 'data',
  method,
  endpoint,
  ...context
});

export interface BusinessVotesQuery extends BusinessVotesOptions {
  page?: number;
}

export interface BusinessVotesResponse {
  votes: VoteRecord[];
  total: number;
  pagination: PaginationMeta;
}

export interface PendingVotesQuery extends PendingVotesFilters {
  page?: number;
  proposalId?: string;
  userId?: string;
}

export interface PendingVotesResponse {
  pendingVotes: PendingVoteRecord[];
  total: number;
  pagination: PaginationMeta;
}

export interface VotingActivityQuery {
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface VotingActivityResponse {
  trends: VotingTrendSummary;
}

export interface ProposalPendingStats {
  proposalId: string;
  totalVotes: number;
  pendingVotes: number;
  participation: string;
}

export interface VotingContractAddressResponse {
  businessId: string;
  contractAddress: string | null;
}

export interface VotingCountsResponse {
  businessId: string;
  totalVotes: number;
  pendingVotes: number;
}

const sanitizeBusinessVotesQuery = (businessId: string, query?: BusinessVotesQuery) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');

  const params = baseApi.sanitizeQueryParams({
    businessId: sanitizedBusinessId,
    page: sanitizeOptionalNumber(query?.page, 'page', { integer: true, min: 1 }),
    limit: sanitizeOptionalNumber(query?.limit, 'limit', { integer: true, min: 1, max: 500 }),
    offset: sanitizeOptionalNumber(query?.offset, 'offset', { integer: true, min: 0 }),
    sortBy: sanitizeOptionalString(query?.sortBy, 'sortBy', {
      allowedValues: ['timestamp', 'proposalId'],
      trim: true
    }),
    sortOrder: sanitizeOptionalString(query?.sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'],
      toLowerCase: true,
      trim: true
    }),
    useCache: sanitizeOptionalBoolean(query?.useCache, 'useCache', { defaultValue: true })
  });

  return { params, businessId: sanitizedBusinessId };
};

const sanitizePendingVotesQuery = (businessId: string, query?: PendingVotesQuery) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');

  const params = baseApi.sanitizeQueryParams({
    businessId: sanitizedBusinessId,
    page: sanitizeOptionalNumber(query?.page, 'page', { integer: true, min: 1 }),
    limit: sanitizeOptionalNumber(query?.limit, 'limit', { integer: true, min: 1, max: 500 }),
    offset: sanitizeOptionalNumber(query?.offset, 'offset', { integer: true, min: 0 }),
    proposalId: sanitizeOptionalString(query?.proposalId, 'proposalId', { maxLength: 200, trim: true }),
    userId: sanitizeOptionalString(query?.userId, 'userId', { maxLength: 200, trim: true }),
    useCache: sanitizeOptionalBoolean(query?.useCache, 'useCache', { defaultValue: true })
  });

  return { params, businessId: sanitizedBusinessId };
};

const sanitizeActivityQuery = (businessId: string, query?: VotingActivityQuery) => {
  const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');

  const startDate = sanitizeOptionalDate(query?.startDate, 'startDate');
  const endDate = sanitizeOptionalDate(query?.endDate, 'endDate');

  const params = baseApi.sanitizeQueryParams({
    businessId: sanitizedBusinessId,
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined
  });

  return { params, businessId: sanitizedBusinessId };
};

const sanitizeProposalId = (proposalId: string): string =>
  sanitizeString(proposalId, 'proposalId', { maxLength: 200, trim: true });

export const votesDataApi = {
  /**
   * Retrieve voting records for a business.
   * GET /api/votes/data
   */
  async getBusinessVotes(businessId: string, query?: BusinessVotesQuery): Promise<BusinessVotesResponse> {
    const endpoint = BASE_PATH;
    const { params, businessId: sanitizedBusinessId } = sanitizeBusinessVotesQuery(businessId, query);

    try {
      const response = await api.get<ApiResponse<BusinessVotesResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch business voting records', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          hasFilters: Boolean(params && Object.keys(params).length > 1)
        })
      );
    }
  },

  /**
   * Retrieve pending votes for a business.
   * GET /api/votes/data/pending
   */
  async getPendingVotes(businessId: string, query?: PendingVotesQuery): Promise<PendingVotesResponse> {
    const endpoint = `${BASE_PATH}/pending`;
    const { params, businessId: sanitizedBusinessId } = sanitizePendingVotesQuery(businessId, query);

    try {
      const response = await api.get<ApiResponse<PendingVotesResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch pending votes', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          hasFilters: Boolean(params && Object.keys(params).length > 1)
        })
      );
    }
  },

  /**
   * Retrieve recent voting activity trends.
   * GET /api/votes/data/activity
   */
  async getRecentVotingActivity(
    businessId: string,
    query?: VotingActivityQuery
  ): Promise<VotingActivityResponse> {
    const endpoint = `${BASE_PATH}/activity`;
    const { params, businessId: sanitizedBusinessId } = sanitizeActivityQuery(businessId, query);

    try {
      const response = await api.get<ApiResponse<VotingActivityResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting activity', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          hasDateFilters: Boolean(query?.startDate || query?.endDate)
        })
      );
    }
  },

  /**
   * Retrieve pending proposal stats.
   * GET /api/votes/data/proposal-stats
   */
  async getProposalPendingStats(businessId: string, proposalId: string): Promise<ProposalPendingStats> {
    const endpoint = `${BASE_PATH}/proposal-stats`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const sanitizedProposalId = sanitizeProposalId(proposalId);

    const params = baseApi.sanitizeQueryParams({
      businessId: sanitizedBusinessId,
      proposalId: sanitizedProposalId
    });

    try {
      const response = await api.get<ApiResponse<ProposalPendingStats>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch proposal pending stats', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, {
          businessId: sanitizedBusinessId,
          proposalId: sanitizedProposalId
        })
      );
    }
  },

  /**
   * Retrieve voting contract address for a business.
   * GET /api/votes/data/contract-address
   */
  async getVoteContractAddress(businessId: string): Promise<VotingContractAddressResponse> {
    const endpoint = `${BASE_PATH}/contract-address`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId });

    try {
      const response = await api.get<ApiResponse<VotingContractAddressResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting contract address', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  },

  /**
   * Retrieve voting counts for a business.
   * GET /api/votes/data/counts
   */
  async getVotingCounts(businessId: string): Promise<VotingCountsResponse> {
    const endpoint = `${BASE_PATH}/counts`;
    const sanitizedBusinessId = sanitizeObjectId(businessId, 'businessId');
    const params = baseApi.sanitizeQueryParams({ businessId: sanitizedBusinessId });

    try {
      const response = await api.get<ApiResponse<VotingCountsResponse>>(endpoint, { params });
      return baseApi.handleResponse(response, 'Failed to fetch voting counts', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createVotesDataLogContext('GET', endpoint, { businessId: sanitizedBusinessId })
      );
    }
  }
};

export default votesDataApi;
