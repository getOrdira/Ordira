// src/lib/api/features/subscriptions/subscriptionsPlans.api.ts
// Subscriptions plans API aligned with backend routes/features/subscriptions/subscriptionsPlans.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  TierComparison,
  TierChangeAnalysis
} from '@/lib/types/features/subscriptions';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/plans';

type HttpMethod = 'GET' | 'POST';

const createSubscriptionsPlansLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'plans',
  method,
  endpoint,
  ...context
});

export interface SubscriptionTierInfo {
  id: string;
  name: string;
  price: string | number;
  stripePriceId?: string;
  features: unknown;
}

export interface TierFeaturesResponse {
  tier: string;
  name: string;
  pricing: Record<string, unknown>;
  features: unknown;
  limits: Record<string, unknown>;
}

export interface TierOnboardingSteps {
  tier: string;
  steps: string[];
}

export interface PlanMetadata {
  tier: string;
  pricing: Record<string, unknown>;
  limits: Record<string, unknown>;
  features: unknown;
}

export interface AnalyzeSubscriptionChangesPayload {
  tier?: string;
  billingCycle?: 'monthly' | 'yearly';
  status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
}

const sanitizeTierQuery = (tier?: string) => {
  return tier ? sanitizeString(tier, 'tier', { maxLength: 100 }) : undefined;
};

const sanitizePlanQueryParams = (query?: { tier?: string }) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    tier: sanitizeOptionalString(query.tier, 'tier', { maxLength: 100 })
  });
};

const sanitizePlanComparisonParams = (query?: { currentTier?: string; targetTier?: string }) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    currentTier: sanitizeOptionalString(query.currentTier, 'currentTier', { maxLength: 100 }),
    targetTier: sanitizeOptionalString(query.targetTier, 'targetTier', { maxLength: 100 })
  });
};

const sanitizeAnalyzePayload = (payload: AnalyzeSubscriptionChangesPayload) => {
  return baseApi.sanitizeRequestData({
    tier: sanitizeOptionalString(payload.tier, 'tier', { maxLength: 100 }),
    billingCycle: sanitizeOptionalString(payload.billingCycle, 'billingCycle', { maxLength: 10 }),
    status: sanitizeOptionalString(payload.status, 'status', { maxLength: 50 })
  });
};

export const subscriptionsPlansApi = {
  /**
   * Retrieve available tiers.
   * GET /api/subscriptions/plans/tiers
   */
  async getAvailableTiers(): Promise<{ tiers: SubscriptionTierInfo[] }> {
    const endpoint = `${BASE_PATH}/tiers`;

    try {
      const response = await api.get<ApiResponse<{ tiers: SubscriptionTierInfo[] }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch available tiers',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve tier features.
   * GET /api/subscriptions/plans/features
   */
  async getTierFeatures(query: { tier: string }): Promise<TierFeaturesResponse> {
    const endpoint = `${BASE_PATH}/features`;
    const params = baseApi.sanitizeQueryParams({
      tier: sanitizeTierQuery(query.tier)
    });

    try {
      const response = await api.get<ApiResponse<TierFeaturesResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch tier features',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('GET', endpoint, { tier: params.tier })
      );
    }
  },

  /**
   * Retrieve onboarding steps.
   * GET /api/subscriptions/plans/onboarding
   */
  async getOnboardingSteps(query?: { tier?: string }): Promise<TierOnboardingSteps> {
    const endpoint = `${BASE_PATH}/onboarding`;
    const params = baseApi.sanitizeQueryParams({
      tier: sanitizeTierQuery(query?.tier)
    });

    try {
      const response = await api.get<ApiResponse<TierOnboardingSteps>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch onboarding steps',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('GET', endpoint, { tier: params.tier })
      );
    }
  },

  /**
   * Retrieve tier comparison for current subscription.
   * GET /api/subscriptions/plans/comparison
   */
  async getTierComparison(query?: { currentTier?: string; targetTier?: string }): Promise<{ businessId: string; comparison: TierComparison }> {
    const endpoint = `${BASE_PATH}/comparison`;
    const params = sanitizePlanComparisonParams(query);

    try {
      const response = await api.get<ApiResponse<{ businessId: string; comparison: TierComparison }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch tier comparison',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Analyze subscription changes.
   * POST /api/subscriptions/plans/analyze-changes
   */
  async analyzeSubscriptionChanges(
    payload: AnalyzeSubscriptionChangesPayload
  ): Promise<{ analysis: TierChangeAnalysis }> {
    const endpoint = `${BASE_PATH}/analyze-changes`;
    const sanitizedPayload = sanitizeAnalyzePayload(payload);

    try {
      const response = await api.post<ApiResponse<{ analysis: TierChangeAnalysis }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to analyze subscription changes',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload && Object.keys(sanitizedPayload).length)
        })
      );
    }
  },

  /**
   * Retrieve plan metadata.
   * GET /api/subscriptions/plans/metadata
   */
  async getPlanMetadata(query?: { tier?: string }): Promise<PlanMetadata> {
    const endpoint = `${BASE_PATH}/metadata`;
    const params = baseApi.sanitizeQueryParams({
      tier: sanitizeOptionalString(query?.tier, 'tier', { maxLength: 100 })
    });

    try {
      const response = await api.get<ApiResponse<PlanMetadata>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch plan metadata',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsPlansLogContext('GET', endpoint, { tier: params.tier })
      );
    }
  }
};

export default subscriptionsPlansApi;
