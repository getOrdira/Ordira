// src/lib/api/features/subscriptions/subscriptionsUsage.api.ts
// Subscriptions usage API aligned with backend routes/features/subscriptions/subscriptionsUsage.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UsageLimitsCheck } from '@/lib/types/features/subscriptions';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalObjectId,
  sanitizeOptionalNumber
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/usage';

type HttpMethod = 'GET' | 'POST';

const createSubscriptionsUsageLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'usage',
  method,
  endpoint,
  ...context
});

export interface UsageCheckPayload {
  businessId?: string;
  amount?: number;
}

export interface UsageRecordPayload {
  businessId?: string;
  count?: number;
}

export interface VotingLimitsSummary {
  voteLimit: number;
  usedThisMonth: number;
  remainingVotes: number | 'unlimited';
  percentage: number;
  allowOverage: boolean;
}

export interface NftLimitsSummary {
  nftLimit: number;
  usedThisMonth: number;
  remainingCertificates: number | 'unlimited';
  percentage: number;
  allowOverage: boolean;
}

const sanitizeUsageCheckPayload = (payload?: UsageCheckPayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    amount: sanitizeOptionalNumber(payload.amount, 'amount', { integer: true, min: 1 })
  });
};

const sanitizeUsageRecordPayload = (payload?: UsageRecordPayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    count: sanitizeOptionalNumber(payload.count, 'count', { integer: true, min: 1 })
  });
};

export const subscriptionsUsageApi = {
  /**
   * Check voting limits.
   * POST /api/subscriptions/usage/check-voting
   */
  async checkVotingLimits(payload?: UsageCheckPayload): Promise<{ result: UsageLimitsCheck }> {
    const endpoint = `${BASE_PATH}/check-voting`;
    const sanitizedPayload = sanitizeUsageCheckPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ result: UsageLimitsCheck }>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to check voting limits',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Check NFT limits.
   * POST /api/subscriptions/usage/check-nft
   */
  async checkNftLimits(payload?: UsageCheckPayload): Promise<{ result: UsageLimitsCheck }> {
    const endpoint = `${BASE_PATH}/check-nft`;
    const sanitizedPayload = sanitizeUsageCheckPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ result: UsageLimitsCheck }>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to check NFT limits',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Check API limits.
   * POST /api/subscriptions/usage/check-api
   */
  async checkApiLimits(payload?: UsageCheckPayload): Promise<{ result: UsageLimitsCheck }> {
    const endpoint = `${BASE_PATH}/check-api`;
    const sanitizedPayload = sanitizeUsageCheckPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ result: UsageLimitsCheck }>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to check API limits',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Record vote usage.
   * POST /api/subscriptions/usage/record-vote
   */
  async recordVoteUsage(payload?: UsageRecordPayload): Promise<{ recorded: { type: string; count: number } }> {
    const endpoint = `${BASE_PATH}/record-vote`;
    const sanitizedPayload = sanitizeUsageRecordPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ recorded: { type: string; count: number } }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to record vote usage',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Record NFT usage.
   * POST /api/subscriptions/usage/record-nft
   */
  async recordNftUsage(payload?: UsageRecordPayload): Promise<{ recorded: { type: string; count: number } }> {
    const endpoint = `${BASE_PATH}/record-nft`;
    const sanitizedPayload = sanitizeUsageRecordPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ recorded: { type: string; count: number } }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to record NFT usage',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Record API usage.
   * POST /api/subscriptions/usage/record-api
   */
  async recordApiUsage(payload?: UsageRecordPayload): Promise<{ recorded: { type: string; count: number } }> {
    const endpoint = `${BASE_PATH}/record-api`;
    const sanitizedPayload = sanitizeUsageRecordPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ recorded: { type: string; count: number } }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to record API usage',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Retrieve voting limits.
   * GET /api/subscriptions/usage/voting-limits
   */
  async getVotingLimits(): Promise<{ limits: VotingLimitsSummary }> {
    const endpoint = `${BASE_PATH}/voting-limits`;

    try {
      const response = await api.get<ApiResponse<{ limits: VotingLimitsSummary }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch voting limits',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve NFT limits.
   * GET /api/subscriptions/usage/nft-limits
   */
  async getNftLimits(): Promise<{ limits: NftLimitsSummary }> {
    const endpoint = `${BASE_PATH}/nft-limits`;

    try {
      const response = await api.get<ApiResponse<{ limits: NftLimitsSummary }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch NFT limits',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsUsageLogContext('GET', endpoint)
      );
    }
  }
};

export default subscriptionsUsageApi;
