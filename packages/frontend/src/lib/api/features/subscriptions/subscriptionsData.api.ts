// src/lib/api/features/subscriptions/subscriptionsData.api.ts
// Subscriptions data API aligned with backend routes/features/subscriptions/subscriptionsData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { SubscriptionSummary, SubscriptionUsageMetrics } from '@/lib/types/features/subscriptions';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalObjectId } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/data';

type HttpMethod = 'GET' | 'POST';

const createSubscriptionsDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'data',
  method,
  endpoint,
  ...context
});

export interface SubscriptionUsageResponse {
  usage: SubscriptionUsageMetrics;
  limits: SubscriptionUsageMetrics;
  usagePercentages: SubscriptionUsageMetrics;
}

export interface SubscriptionUsageResetResult {
  result: {
    reset: number;
    errors: string[];
  };
  resetAt: string;
}

export interface SubscriptionContact {
  id: string;
  email?: string;
}

const sanitizeBusinessScopedQuery = (query?: { businessId?: string }) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId')
  });
};

const sanitizeUsageResetPayload = (payload?: { businessId?: string }) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId')
  });
};

export const subscriptionsDataApi = {
  /**
   * Retrieve subscription summary.
   * GET /api/subscriptions/data/summary
   */
  async getSubscriptionSummary(query?: { businessId?: string }): Promise<SubscriptionSummary> {
    const endpoint = `${BASE_PATH}/summary`;
    const params = sanitizeBusinessScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ summary: SubscriptionSummary }>>(endpoint, {
        params
      });
      const { summary } = baseApi.handleResponse(
        response,
        'Failed to fetch subscription summary',
        500
      );
      return summary;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDataLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve subscription usage metrics.
   * GET /api/subscriptions/data/usage
   */
  async getSubscriptionUsage(query?: { businessId?: string }): Promise<SubscriptionUsageResponse> {
    const endpoint = `${BASE_PATH}/usage`;
    const params = sanitizeBusinessScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<SubscriptionUsageResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch subscription usage',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDataLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Reset subscription usage counters.
   * POST /api/subscriptions/data/reset-usage
   */
  async resetSubscriptionUsage(payload?: { businessId?: string }): Promise<SubscriptionUsageResetResult> {
    const endpoint = `${BASE_PATH}/reset-usage`;
    const sanitizedPayload = sanitizeUsageResetPayload(payload);

    try {
      const response = await api.post<ApiResponse<SubscriptionUsageResetResult>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to reset subscription usage',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDataLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  },

  /**
   * Retrieve subscription billing contact.
   * GET /api/subscriptions/data/contact
   */
  async getSubscriptionContact(query?: { businessId?: string }): Promise<SubscriptionContact | null> {
    const endpoint = `${BASE_PATH}/contact`;
    const params = sanitizeBusinessScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ contact: SubscriptionContact | null }>>(endpoint, {
        params
      });
      const { contact } = baseApi.handleResponse(
        response,
        'Failed to fetch subscription contact',
        500
      );
      return contact ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDataLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  }
};

export default subscriptionsDataApi;
