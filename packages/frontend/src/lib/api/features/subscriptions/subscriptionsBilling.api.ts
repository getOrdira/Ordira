// src/lib/api/features/subscriptions/subscriptionsBilling.api.ts
// Subscriptions billing API aligned with backend routes/features/subscriptions/subscriptionsBilling.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { PlanKey } from '@backend/constants/plans';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeOptionalArray,
  sanitizeOptionalBoolean,
  sanitizeOptionalJsonObject
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/billing';

type HttpMethod = 'GET' | 'POST' | 'PUT';

const createSubscriptionsBillingLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'billing',
  method,
  endpoint,
  ...context
});

export interface SubscriptionCheckoutSession {
  sessionId: string;
  url?: string | null;
}

export type SubscriptionBillingRecord = Record<string, unknown>;

export interface PricingSummary {
  [key: string]: unknown;
}

export interface TokenDiscountUpdateResult {
  hasDiscounts: boolean;
  [key: string]: unknown;
}

export interface OverageBillingStatus {
  enabled: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface CheckoutSessionInput {
  plan: PlanKey | string;
  couponCode?: string;
  addons?: string[];
  metadata?: Record<string, unknown>;
}

export interface PaymentMethodInput {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

export interface BillingProfileInput {
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    line2?: string;
  };
  taxId?: string;
  companyName?: string;
  additionalMetadata?: Record<string, unknown>;
}

export interface TokenDiscountPayload {
  walletAddress?: string;
}

export interface PricingSummaryQuery {
  plan: PlanKey | string;
  couponCode?: string;
  addons?: string[];
}

const sanitizeCheckoutPayload = (payload: CheckoutSessionInput) => {
  const addons = sanitizeOptionalArray(
    payload.addons,
    'addons',
    (value, index) => sanitizeString(value, `addons[${index}]`, { maxLength: 100 })
  );

  return baseApi.sanitizeRequestData({
    plan: sanitizeString(payload.plan, 'plan', { maxLength: 100 }),
    couponCode: sanitizeOptionalString(payload.couponCode, 'couponCode', { maxLength: 100 }),
    addons,
    metadata: sanitizeOptionalJsonObject(payload.metadata, 'metadata')
  });
};

const sanitizePaymentMethodPayload = (payload: PaymentMethodInput) => {
  return baseApi.sanitizeRequestData({
    paymentMethodId: sanitizeString(payload.paymentMethodId, 'paymentMethodId', { maxLength: 200 }),
    setAsDefault: sanitizeOptionalBoolean(payload.setAsDefault, 'setAsDefault')
  });
};

const sanitizeBillingProfilePayload = (payload: BillingProfileInput) => {
  return baseApi.sanitizeRequestData({
    billingAddress: payload.billingAddress
      ? baseApi.sanitizeRequestData({
          line1: sanitizeString(payload.billingAddress.line1, 'billingAddress.line1', { maxLength: 200 }),
          city: sanitizeString(payload.billingAddress.city, 'billingAddress.city', { maxLength: 100 }),
          state: sanitizeString(payload.billingAddress.state, 'billingAddress.state', { maxLength: 100 }),
          postalCode: sanitizeString(payload.billingAddress.postalCode, 'billingAddress.postalCode', { maxLength: 20 }),
          country: sanitizeString(payload.billingAddress.country, 'billingAddress.country', { maxLength: 100 }),
          line2: sanitizeOptionalString(payload.billingAddress.line2, 'billingAddress.line2', { maxLength: 200 })
        })
      : undefined,
    taxId: sanitizeOptionalString(payload.taxId, 'taxId', { maxLength: 100 }),
    companyName: sanitizeOptionalString(payload.companyName, 'companyName', { maxLength: 200 }),
    additionalMetadata: sanitizeOptionalJsonObject(payload.additionalMetadata, 'additionalMetadata')
  });
};

const sanitizeTokenDiscountPayload = (payload?: TokenDiscountPayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    walletAddress: sanitizeOptionalString(payload.walletAddress, 'walletAddress', { maxLength: 200 })
  });
};

const sanitizePricingSummaryQuery = (query: PricingSummaryQuery) => {
  const sanitizedAddons = sanitizeOptionalArray(
    query.addons,
    'addons',
    (value, index) => sanitizeString(value, `addons[${index}]`, { maxLength: 100 })
  );

  return baseApi.sanitizeQueryParams({
    plan: sanitizeString(query.plan, 'plan', { maxLength: 100 }),
    couponCode: sanitizeOptionalString(query.couponCode, 'couponCode', { maxLength: 100 }),
    addons: sanitizedAddons && sanitizedAddons.length > 0 ? sanitizedAddons.join(',') : undefined
  });
};

export const subscriptionsBillingApi = {
  /**
   * Retrieve billing information.
   * GET /api/subscriptions/billing/info
   */
  async getBillingInfo(): Promise<SubscriptionBillingRecord | null> {
    const endpoint = `${BASE_PATH}/info`;

    try {
      const response = await api.get<ApiResponse<{ billing: SubscriptionBillingRecord | null }>>(endpoint);
      const { billing } = baseApi.handleResponse(
        response,
        'Failed to fetch billing info',
        500
      );
      return billing ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve comprehensive billing summary.
   * GET /api/subscriptions/billing/comprehensive
   */
  async getComprehensiveBillingInfo(): Promise<Record<string, unknown>> {
    const endpoint = `${BASE_PATH}/comprehensive`;

    try {
      const response = await api.get<ApiResponse<{ summary: Record<string, unknown> }>>(endpoint);
      const { summary } = baseApi.handleResponse(
        response,
        'Failed to fetch comprehensive billing info',
        500
      );
      return summary;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Create a checkout session.
   * POST /api/subscriptions/billing/checkout
   */
  async createCheckoutSession(payload: CheckoutSessionInput): Promise<SubscriptionCheckoutSession> {
    const endpoint = `${BASE_PATH}/checkout`;
    const sanitizedPayload = sanitizeCheckoutPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ session: SubscriptionCheckoutSession }>>(
        endpoint,
        sanitizedPayload
      );
      const { session } = baseApi.handleResponse(
        response,
        'Failed to create checkout session',
        500
      );
      return session;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('POST', endpoint, { plan: sanitizedPayload.plan })
      );
    }
  },

  /**
   * Update payment method.
   * PUT /api/subscriptions/billing/payment-method
   */
  async updatePaymentMethod(payload: PaymentMethodInput): Promise<Record<string, unknown>> {
    const endpoint = `${BASE_PATH}/payment-method`;
    const sanitizedPayload = sanitizePaymentMethodPayload(payload);

    try {
      const response = await api.put<ApiResponse<{ result: Record<string, unknown> }>>(
        endpoint,
        sanitizedPayload
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to update payment method',
        500
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('PUT', endpoint, {
          paymentMethodId: sanitizedPayload.paymentMethodId
        })
      );
    }
  },

  /**
   * Update billing profile.
   * PUT /api/subscriptions/billing/profile
   */
  async updateBillingProfile(payload: BillingProfileInput): Promise<SubscriptionBillingRecord | null> {
    const endpoint = `${BASE_PATH}/profile`;
    const sanitizedPayload = sanitizeBillingProfilePayload(payload);

    try {
      const response = await api.put<ApiResponse<{ billing: SubscriptionBillingRecord | null }>>(
        endpoint,
        sanitizedPayload
      );
      const { billing } = baseApi.handleResponse(
        response,
        'Failed to update billing profile',
        500
      );
      return billing ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('PUT', endpoint, {
          hasAddress: Boolean(sanitizedPayload.billingAddress)
        })
      );
    }
  },

  /**
   * Refresh token discounts.
   * POST /api/subscriptions/billing/refresh-token-discounts
   */
  async refreshTokenDiscounts(payload?: TokenDiscountPayload): Promise<TokenDiscountUpdateResult> {
    const endpoint = `${BASE_PATH}/refresh-token-discounts`;
    const sanitizedPayload = sanitizeTokenDiscountPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ result: TokenDiscountUpdateResult }>>(
        endpoint,
        sanitizedPayload
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to refresh token discounts',
        500
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('POST', endpoint, {
          hasWallet: Boolean(sanitizedPayload?.walletAddress)
        })
      );
    }
  },

  /**
   * Remove token discounts.
   * POST /api/subscriptions/billing/remove-token-discounts
   */
  async removeTokenDiscounts(): Promise<Record<string, unknown>> {
    const endpoint = `${BASE_PATH}/remove-token-discounts`;

    try {
      const response = await api.post<ApiResponse<{ result: Record<string, unknown> }>>(endpoint);
      const { result } = baseApi.handleResponse(
        response,
        'Failed to remove token discounts',
        500
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Calculate pricing summary.
   * GET /api/subscriptions/billing/calculate-pricing
   */
  async calculatePricingSummary(query: PricingSummaryQuery): Promise<PricingSummary> {
    const endpoint = `${BASE_PATH}/calculate-pricing`;
    const params = sanitizePricingSummaryQuery(query);

    try {
      const response = await api.get<ApiResponse<{ summary: PricingSummary }>>(endpoint, { params });
      const { summary } = baseApi.handleResponse(
        response,
        'Failed to calculate pricing summary',
        500
      );
      return summary;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('GET', endpoint, {
          plan: params.plan,
          hasAddons: Boolean(params.addons)
        })
      );
    }
  },

  /**
   * Retrieve overage billing status.
   * GET /api/subscriptions/billing/overage-status
   */
  async getOverageBillingStatus(): Promise<OverageBillingStatus> {
    const endpoint = `${BASE_PATH}/overage-status`;

    try {
      const response = await api.get<ApiResponse<{ status: OverageBillingStatus }>>(endpoint);
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch overage billing status',
        500
      );
      return status;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsBillingLogContext('GET', endpoint)
      );
    }
  }
};

export default subscriptionsBillingApi;
