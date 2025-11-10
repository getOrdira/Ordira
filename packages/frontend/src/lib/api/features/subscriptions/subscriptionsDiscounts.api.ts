// src/lib/api/features/subscriptions/subscriptionsDiscounts.api.ts
// Subscriptions discounts API aligned with backend routes/features/subscriptions/subscriptionsDiscounts.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  TokenDiscount,
  DiscountEligibility,
  StripeDiscountApplication
} from '@backend/services/subscriptions/features/tokenDiscount.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalBoolean,
  sanitizeOptionalArray
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/discounts';

type HttpMethod = 'GET' | 'POST';

const createSubscriptionsDiscountsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'discounts',
  method,
  endpoint,
  ...context
});

const DISCOUNT_TIMEFRAMES = ['last_30_days', 'last_90_days', 'all_time'] as const;
const BILLING_CYCLES = ['monthly', 'yearly'] as const;

export type DiscountUsageTimeframe = typeof DISCOUNT_TIMEFRAMES[number];

export interface WalletQueryParams {
  walletAddress?: string;
  timeframe?: DiscountUsageTimeframe;
  subscriptionAmount?: number;
  billingCycle?: typeof BILLING_CYCLES[number];
}

export interface ApplyDiscountPayload {
  customerId: string;
  walletAddress: string;
  subscriptionId?: string;
  validateBalance?: boolean;
}

export interface RemoveDiscountPayload {
  customerId: string;
  subscriptionId?: string;
}

export interface DiscountValidationSummary {
  valid: string[];
  invalid: string[];
  missing: string[];
}

export interface DiscountCreationSummary {
  created: Array<{ tierName: string; couponId: string }>;
  errors: Array<{ tierName: string; error: string }>;
}

export interface DiscountUsageStats {
  totalApplications: number;
  totalSavings: number;
  topTiers: Array<{ tierName: string; applications: number; savings: number }>;
  uniqueWallets: number;
}

export interface TokenDiscountSavings {
  currentDiscount: number;
  monthlySavings: number;
  yearlySavings: number;
  nextTierSavings?: {
    additionalTokensNeeded: number;
    additionalMonthlySavings: number;
    additionalYearlySavings: number;
  };
}

export interface TokenDiscountInfo {
  balance: number;
  couponId?: string;
  discountPercentage?: number;
  tierName?: string;
  nextTierThreshold?: number;
  nextTierDiscount?: number;
}

const sanitizeWalletQuery = (query?: WalletQueryParams) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    walletAddress: query.walletAddress
      ? sanitizeString(query.walletAddress, 'walletAddress', { maxLength: 200 })
      : undefined,
    timeframe: sanitizeOptionalEnum(query.timeframe, 'timeframe', DISCOUNT_TIMEFRAMES),
    subscriptionAmount: sanitizeOptionalNumber(query.subscriptionAmount, 'subscriptionAmount', { min: 0 }),
    billingCycle: sanitizeOptionalEnum(query.billingCycle, 'billingCycle', BILLING_CYCLES)
  });
};

const sanitizeApplyDiscountPayload = (payload: ApplyDiscountPayload) => {
  return baseApi.sanitizeRequestData({
    customerId: sanitizeString(payload.customerId, 'customerId', { maxLength: 200 }),
    walletAddress: sanitizeString(payload.walletAddress, 'walletAddress', { maxLength: 200 }),
    subscriptionId: sanitizeOptionalString(payload.subscriptionId, 'subscriptionId', { maxLength: 200 }),
    validateBalance: sanitizeOptionalBoolean(payload.validateBalance, 'validateBalance')
  });
};

const sanitizeRemoveDiscountPayload = (payload: RemoveDiscountPayload) => {
  return baseApi.sanitizeRequestData({
    customerId: sanitizeString(payload.customerId, 'customerId', { maxLength: 200 }),
    subscriptionId: sanitizeOptionalString(payload.subscriptionId, 'subscriptionId', { maxLength: 200 })
  });
};

export const subscriptionsDiscountsApi = {
  /**
   * Retrieve wallet balance.
   * GET /api/subscriptions/discounts/wallet-balance
   */
  async getWalletBalance(query: WalletQueryParams): Promise<{ walletAddress: string; balance: number }> {
    const endpoint = `${BASE_PATH}/wallet-balance`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{ walletAddress: string; balance: number }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to retrieve wallet balance',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve available token discounts.
   * GET /api/subscriptions/discounts/available
   */
  async getAvailableDiscounts(query: WalletQueryParams): Promise<{ walletAddress: string; discounts: TokenDiscount[] }> {
    const endpoint = `${BASE_PATH}/available`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{ walletAddress: string; discounts: TokenDiscount[] }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch available discounts',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Check discount eligibility.
   * GET /api/subscriptions/discounts/eligibility
   */
  async checkDiscountEligibility(query: WalletQueryParams): Promise<{ walletAddress: string; eligibility: DiscountEligibility }> {
    const endpoint = `${BASE_PATH}/eligibility`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{ walletAddress: string; eligibility: DiscountEligibility }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to evaluate discount eligibility',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Apply token discount.
   * POST /api/subscriptions/discounts/apply
   */
  async applyTokenDiscount(payload: ApplyDiscountPayload): Promise<{ application: StripeDiscountApplication }> {
    const endpoint = `${BASE_PATH}/apply`;
    const sanitizedPayload = sanitizeApplyDiscountPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ application: StripeDiscountApplication }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to apply token discount',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('POST', endpoint, {
          customerId: sanitizedPayload.customerId
        })
      );
    }
  },

  /**
   * Remove token discount.
   * POST /api/subscriptions/discounts/remove
   */
  async removeTokenDiscount(payload: RemoveDiscountPayload): Promise<{ removed: boolean }> {
    const endpoint = `${BASE_PATH}/remove`;
    const sanitizedPayload = sanitizeRemoveDiscountPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ removed: boolean }>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to remove token discount',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('POST', endpoint, {
          customerId: sanitizedPayload.customerId
        })
      );
    }
  },

  /**
   * Validate Stripe coupons.
   * POST /api/subscriptions/discounts/validate-coupons
   */
  async validateStripeCoupons(): Promise<{ validation: DiscountValidationSummary }> {
    const endpoint = `${BASE_PATH}/validate-coupons`;

    try {
      const response = await api.post<ApiResponse<{ validation: DiscountValidationSummary }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to validate Stripe coupons',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Create missing Stripe coupons.
   * POST /api/subscriptions/discounts/create-coupons
   */
  async createMissingCoupons(): Promise<{ created: DiscountCreationSummary['created']; errors: DiscountCreationSummary['errors'] }> {
    const endpoint = `${BASE_PATH}/create-coupons`;

    try {
      const response = await api.post<ApiResponse<DiscountCreationSummary>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to create missing coupons',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Retrieve discount usage stats.
   * GET /api/subscriptions/discounts/usage-stats
   */
  async getDiscountUsageStats(query?: WalletQueryParams): Promise<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }> {
    const endpoint = `${BASE_PATH}/usage-stats`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to retrieve discount usage stats',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Calculate potential savings.
   * GET /api/subscriptions/discounts/potential-savings
   */
  async calculatePotentialSavings(query: WalletQueryParams): Promise<{
    walletAddress: string;
    billingCycle: typeof BILLING_CYCLES[number];
    savings: TokenDiscountSavings;
  }> {
    const endpoint = `${BASE_PATH}/potential-savings`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{
        walletAddress: string;
        billingCycle: typeof BILLING_CYCLES[number];
        savings: TokenDiscountSavings;
      }>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to calculate potential savings',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve wallet discount info.
   * GET /api/subscriptions/discounts/wallet-info
   */
  async getWalletDiscountInfo(query: WalletQueryParams): Promise<{ walletAddress: string; info: TokenDiscountInfo | null }> {
    const endpoint = `${BASE_PATH}/wallet-info`;
    const params = sanitizeWalletQuery(query);

    try {
      const response = await api.get<ApiResponse<{ walletAddress: string; info: TokenDiscountInfo | null }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to retrieve wallet discount info',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsDiscountsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  }
};

export default subscriptionsDiscountsApi;
