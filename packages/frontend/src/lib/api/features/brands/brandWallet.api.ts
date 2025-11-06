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

const BASE_PATH = '/brand/wallet';

const sanitize = (input?: Record<string, unknown>) => {
  if (!input) {
    return undefined;
  }
  return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

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
      console.error('Brand wallet validation error:', error);
      throw error;
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
      console.error('Brand wallet ownership verification error:', error);
      throw error;
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
      console.error('Brand wallet status fetch error:', error);
      throw error;
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
      console.error('Brand wallet token discount update error:', error);
      throw error;
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
      console.error('Brand certificate wallet update error:', error);
      throw error;
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
      console.error('Brand wallet batch token discount update error:', error);
      throw error;
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
      console.error('Brand wallet change handling error:', error);
      throw error;
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
      console.error('Brand wallet verification message generation error:', error);
      throw error;
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
      console.error('Brand wallet statistics fetch error:', error);
      throw error;
    }
  },
};

export default brandWalletApi;


