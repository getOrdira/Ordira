// src/lib/api/features/brands/brandWallet.api.ts
// Brand wallet API aligned with backend routes/features/brands/brandWallet.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandCertificateWalletUpdate,
  BrandWalletStatistics,
  TokenDiscountInfo,
  WalletOwnershipResult,
  WalletValidationResult,
  WalletVerificationStatus
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand/wallet';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createBrandLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'brands',
  method,
  endpoint,
  ...context
});

export interface WalletValidationPayload {
  address: string;
  options?: {
    checkBalance?: boolean;
    validateFormat?: boolean;
  };
}

export interface WalletOwnershipPayload {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface TokenDiscountPayload {
  tokenAddress: string;
  discountPercentage: number;
  minAmount?: number;
}

export interface TokenDiscountUpdatePayload {
  walletAddress: string;
  discounts: TokenDiscountPayload[];
}

export interface CertificateWalletPayload {
  walletAddress: string;
  isDefault?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BatchTokenDiscountPayload {
  businessIds: string[];
  discounts: TokenDiscountPayload[];
}

export interface WalletChangePayload {
  newWallet: string;
  oldWallet: string;
  signature: string;
}

export interface VerificationMessagePayload {
  timestamp?: number;
}

export const brandWalletApi = {
  /**
   * Validate wallet address.
   * POST /api/brand/wallet/validate
   */
  async validateWallet(payload: WalletValidationPayload): Promise<WalletValidationResult> {
    try {
      const response = await api.post<ApiResponse<{ result: WalletValidationResult }>>(
        `${BASE_PATH}/validate`,
        baseApi.sanitizeRequestData(payload),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to validate wallet',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/validate`, {
          address: payload.address,
        }),
      );
    }
  },

  /**
   * Verify wallet ownership.
   * POST /api/brand/wallet/verify
   */
  async verifyWalletOwnership(payload: WalletOwnershipPayload): Promise<WalletOwnershipResult> {
    try {
      const response = await api.post<ApiResponse<{ result: WalletOwnershipResult }>>(
        `${BASE_PATH}/verify`,
        baseApi.sanitizeRequestData(payload),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to verify wallet ownership',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/verify`, {
          walletAddress: payload.walletAddress,
        }),
      );
    }
  },

  /**
   * Retrieve wallet verification status.
   * GET /api/brand/wallet/status
   */
  async getVerificationStatus(): Promise<WalletVerificationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: WalletVerificationStatus }>>(
        `${BASE_PATH}/status`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch wallet verification status',
        500,
      );
      return status;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/status`),
      );
    }
  },

  /**
   * Update token discounts for a brand wallet.
   * PUT /api/brand/wallet/token-discounts
   */
  async updateTokenDiscounts(payload: TokenDiscountUpdatePayload): Promise<TokenDiscountInfo> {
    try {
      const response = await api.put<ApiResponse<{ result: TokenDiscountInfo }>>(
        `${BASE_PATH}/token-discounts`,
        baseApi.sanitizeRequestData(payload),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to update token discounts',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('PUT', `${BASE_PATH}/token-discounts`, {
          walletAddress: payload.walletAddress,
          discountCount: payload.discounts?.length ?? 0,
        }),
      );
    }
  },

  /**
   * Update certificate wallet.
   * PUT /api/brand/wallet/certificate
   */
  async updateCertificateWallet(
    payload: CertificateWalletPayload,
  ): Promise<BrandCertificateWalletUpdate> {
    try {
      const response = await api.put<ApiResponse<{ result: BrandCertificateWalletUpdate }>>(
        `${BASE_PATH}/certificate`,
        baseApi.sanitizeRequestData(payload),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to update certificate wallet',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('PUT', `${BASE_PATH}/certificate`, {
          walletAddress: payload.walletAddress,
        }),
      );
    }
  },

  /**
   * Batch update token discounts for multiple brands.
   * POST /api/brand/wallet/token-discounts/batch
   */
  async batchUpdateTokenDiscounts(
    payload: BatchTokenDiscountPayload,
  ): Promise<TokenDiscountInfo[]> {
    try {
      const response = await api.post<ApiResponse<{ results: TokenDiscountInfo[] }>>(
        `${BASE_PATH}/token-discounts/batch`,
        baseApi.sanitizeRequestData(payload),
      );
      const { results } = baseApi.handleResponse(
        response,
        'Failed to batch update token discounts',
        400,
      );
      return results;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/token-discounts/batch`, {
          businessCount: payload.businessIds?.length ?? 0,
          discountCount: payload.discounts?.length ?? 0,
        }),
      );
    }
  },

  /**
   * Handle wallet address change workflow.
   * POST /api/brand/wallet/change
   */
  async handleWalletChange(payload: WalletChangePayload): Promise<string> {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>(
        `${BASE_PATH}/change`,
        baseApi.sanitizeRequestData(payload),
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to process wallet change',
        400,
      );
      return message;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/change`, {
          newWallet: payload.newWallet,
          oldWallet: payload.oldWallet,
        }),
      );
    }
  },

  /**
   * Generate verification message for signing.
   * POST /api/brand/wallet/verification-message
   */
  async generateVerificationMessage(
    payload?: VerificationMessagePayload,
  ): Promise<string> {
    try {
      const response = await api.post<ApiResponse<{ message: string }>>(
        `${BASE_PATH}/verification-message`,
        baseApi.sanitizeRequestData(payload ?? {}),
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to generate verification message',
        400,
      );
      return message;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/verification-message`),
      );
    }
  },

  /**
   * Retrieve wallet statistics.
   * GET /api/brand/wallet/statistics
   */
  async getWalletStatistics(): Promise<BrandWalletStatistics> {
    try {
      const response = await api.get<ApiResponse<{ stats: BrandWalletStatistics }>>(
        `${BASE_PATH}/statistics`,
      );
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch wallet statistics',
        500,
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/statistics`),
      );
    }
  },
};

export default brandWalletApi;


