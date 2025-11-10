// src/lib/api/features/subscriptions/subscriptionsLifecycle.api.ts
// Subscriptions lifecycle API aligned with backend routes/features/subscriptions/subscriptionsLifecycle.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionSummary
} from '@/lib/types/features/subscriptions';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeOptionalBoolean,
  sanitizeOptionalObjectId,
  sanitizeOptionalEnum
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/lifecycle';

type HttpMethod = 'POST' | 'PUT';

const createSubscriptionsLifecycleLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'lifecycle',
  method,
  endpoint,
  ...context
});

const BILLING_CYCLES = ['monthly', 'yearly'] as const;
const SUBSCRIPTION_STATUSES = ['active', 'inactive', 'past_due', 'canceled', 'paused'] as const;

export interface CreateSubscriptionPayload extends Omit<CreateSubscriptionInput, 'businessId'> {
  businessId?: string;
}

export interface UpdateSubscriptionPayload extends UpdateSubscriptionInput {
  businessId?: string;
}

export interface CancelSubscriptionPayload {
  businessId?: string;
  cancelImmediately?: boolean;
  reason?: string;
}

export interface CancelSubscriptionResult {
  canceledAt: string;
  effectiveDate: string;
  refund?: number;
  [key: string]: unknown;
}

const sanitizeCreatePayload = (payload: CreateSubscriptionPayload) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    tier: sanitizeString(payload.tier, 'tier', { maxLength: 100 }),
    billingCycle: sanitizeOptionalEnum(payload.billingCycle, 'billingCycle', BILLING_CYCLES),
    stripeSubscriptionId: sanitizeOptionalString(payload.stripeSubscriptionId, 'stripeSubscriptionId', { maxLength: 200 }),
    isTrialPeriod: sanitizeOptionalBoolean(payload.isTrialPeriod, 'isTrialPeriod'),
    trialDays: payload.trialDays,
    planType: sanitizeOptionalEnum(payload.planType, 'planType', ['brand', 'manufacturer'] as const)
  });
};

const sanitizeUpdatePayload = (payload: UpdateSubscriptionPayload) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    tier: sanitizeOptionalString(payload.tier, 'tier', { maxLength: 100 }),
    status: sanitizeOptionalEnum(payload.status, 'status', SUBSCRIPTION_STATUSES),
    billingCycle: sanitizeOptionalEnum(payload.billingCycle, 'billingCycle', BILLING_CYCLES),
    cancelAtPeriodEnd: sanitizeOptionalBoolean(payload.cancelAtPeriodEnd, 'cancelAtPeriodEnd')
  });
};

const sanitizeCancelPayload = (payload: CancelSubscriptionPayload) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    cancelImmediately: sanitizeOptionalBoolean(payload.cancelImmediately, 'cancelImmediately'),
    reason: sanitizeOptionalString(payload.reason, 'reason', { maxLength: 1000 })
  });
};

export const subscriptionsLifecycleApi = {
  /**
   * Create a subscription.
   * POST /api/subscriptions/lifecycle
   */
  async createSubscription(payload: CreateSubscriptionPayload): Promise<SubscriptionSummary> {
    const endpoint = `${BASE_PATH}`;
    const sanitizedPayload = sanitizeCreatePayload(payload);

    try {
      const response = await api.post<ApiResponse<{ subscription: SubscriptionSummary }>>(
        endpoint,
        sanitizedPayload
      );
      const { subscription } = baseApi.handleResponse(
        response,
        'Failed to create subscription',
        500
      );
      return subscription;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsLifecycleLogContext('POST', endpoint, {
          tier: sanitizedPayload.tier
        })
      );
    }
  },

  /**
   * Update subscription attributes.
   * PUT /api/subscriptions/lifecycle
   */
  async updateSubscription(payload: UpdateSubscriptionPayload): Promise<SubscriptionSummary> {
    const endpoint = `${BASE_PATH}`;
    const sanitizedPayload = sanitizeUpdatePayload(payload);

    try {
      const response = await api.put<ApiResponse<{ subscription: SubscriptionSummary }>>(
        endpoint,
        sanitizedPayload
      );
      const { subscription } = baseApi.handleResponse(
        response,
        'Failed to update subscription',
        500
      );
      return subscription;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsLifecycleLogContext('PUT', endpoint, {
          hasChanges: Object.keys(sanitizedPayload ?? {}).length > 0
        })
      );
    }
  },

  /**
   * Cancel a subscription.
   * POST /api/subscriptions/lifecycle/cancel
   */
  async cancelSubscription(payload: CancelSubscriptionPayload): Promise<{ cancellation: CancelSubscriptionResult }> {
    const endpoint = `${BASE_PATH}/cancel`;
    const sanitizedPayload = sanitizeCancelPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ cancellation: CancelSubscriptionResult }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to cancel subscription',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsLifecycleLogContext('POST', endpoint, {
          cancelImmediately: sanitizedPayload.cancelImmediately
        })
      );
    }
  },

  /**
   * Reactivate a subscription.
   * POST /api/subscriptions/lifecycle/reactivate
   */
  async reactivateSubscription(payload?: { businessId?: string }): Promise<SubscriptionSummary> {
    const endpoint = `${BASE_PATH}/reactivate`;
    const sanitizedPayload = sanitizeUpdatePayload(payload ?? {});

    try {
      const response = await api.post<ApiResponse<{ subscription: SubscriptionSummary }>>(
        endpoint,
        sanitizedPayload
      );
      const { subscription } = baseApi.handleResponse(
        response,
        'Failed to reactivate subscription',
        500
      );
      return subscription;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsLifecycleLogContext('POST', endpoint, {
          hasBusinessId: Boolean(sanitizedPayload.businessId)
        })
      );
    }
  }
};

export default subscriptionsLifecycleApi;
