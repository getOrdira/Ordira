// src/lib/api/features/certificates/certificateAccount.api.ts
// Certificate account API aligned with backend routes/features/certificates/certificateAccount.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CertificateStats,
  CertificateUsage,
  TransferUsage,
  OwnershipStatus,
  TransferHealth,
} from '@backend/services/certificates/core';
import {
  sanitizeBoolean,
  sanitizeDays,
  sanitizeMonthsBack,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalString,
  sanitizePlan,
  sanitizeQuery,
} from './utils';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/certificates/account';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createAccountLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'certificates',
  module: 'account',
  method,
  endpoint,
  ...context,
});

export const certificateAccountApi = {
  /**
   * Get certificate statistics.
   * GET /certificates/account/stats
   */
  async getCertificateStats(options?: { includeDistribution?: boolean; includeWallet?: boolean }): Promise<{ stats: CertificateStats }> {
    const params = sanitizeQuery({
      includeDistribution: options?.includeDistribution !== undefined ? sanitizeBoolean(options.includeDistribution, 'includeDistribution') : undefined,
      includeWallet: options?.includeWallet !== undefined ? sanitizeBoolean(options.includeWallet, 'includeWallet') : undefined,
    });

    try {
      const response = await api.get<ApiResponse<{ stats: CertificateStats }>>(
        `${BASE_PATH}/stats`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate stats', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/stats`, params),
      );
    }
  },

  /**
   * Get certificate usage.
   * GET /certificates/account/usage
   */
  async getCertificateUsage(options?: { timeframe?: 'month' | 'year' | 'all' }): Promise<{ usage: CertificateUsage }> {
    const timeframe = options?.timeframe ? sanitizeOptionalString(options.timeframe, { fieldName: 'timeframe', maxLength: 10 }) : undefined;
    if (timeframe && timeframe !== 'month' && timeframe !== 'year' && timeframe !== 'all') {
      throw new Error("timeframe must be one of 'month', 'year', or 'all'");
    }

    const params = sanitizeQuery({ timeframe });

    try {
      const response = await api.get<ApiResponse<{ usage: CertificateUsage }>>(
        `${BASE_PATH}/usage`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate usage', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/usage`, params),
      );
    }
  },

  /**
   * Get transfer usage.
   * GET /certificates/account/transfer-usage
   */
  async getTransferUsage(options?: { includeAnalytics?: boolean }): Promise<{ transferUsage: TransferUsage }> {
    const params = sanitizeQuery({
      includeAnalytics: sanitizeOptionalBoolean(options?.includeAnalytics, 'includeAnalytics'),
    });

    try {
      const response = await api.get<ApiResponse<{ transferUsage: TransferUsage }>>(
        `${BASE_PATH}/transfer-usage`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer usage', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/transfer-usage`, params),
      );
    }
  },

  /**
   * Get certificate distribution.
   * GET /certificates/account/distribution
   */
  async getCertificateDistribution(options?: { groupBy?: 'status' | 'product' | 'month' }): Promise<{ distribution: Record<string, number> }> {
    const groupBy = options?.groupBy ? sanitizeOptionalString(options.groupBy, { fieldName: 'groupBy', maxLength: 20 }) : undefined;
    if (groupBy && groupBy !== 'status' && groupBy !== 'product' && groupBy !== 'month') {
      throw new Error("groupBy must be one of 'status', 'product', or 'month'");
    }

    const params = sanitizeQuery({ groupBy });

    try {
      const response = await api.get<ApiResponse<{ distribution: Record<string, number> }>>(
        `${BASE_PATH}/distribution`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate distribution', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/distribution`, params),
      );
    }
  },

  /**
   * Get monthly certificate trends.
   * GET /certificates/account/monthly-trends
   */
  async getMonthlyCertificateTrends(options?: { monthsBack?: number }): Promise<{ trends: Array<{ month: string; count: number }> }> {
    const params = sanitizeQuery({
      monthsBack: options?.monthsBack !== undefined ? sanitizeMonthsBack(options.monthsBack, 'monthsBack') : undefined,
    });

    try {
      const response = await api.get<ApiResponse<{ trends: Array<{ month: string; count: number }> }>>(
        `${BASE_PATH}/monthly-trends`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate trends', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/monthly-trends`, params),
      );
    }
  },

  /**
   * Get certificates by product counts.
   * GET /certificates/account/by-product
   */
  async getCertificatesByProduct(): Promise<{ productCounts: Array<{ productId: string; count: number }> }> {
    try {
      const response = await api.get<ApiResponse<{ productCounts: Array<{ productId: string; count: number }> }>>(
        `${BASE_PATH}/by-product`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificates by product', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/by-product`),
      );
    }
  },

  /**
   * Check plan limits.
   * GET /certificates/account/plan-limits
   */
  async checkPlanLimits(options?: { planType?: string }): Promise<{ limits: { used: number; limit: number; percentage: number; nearingLimit: boolean } }> {
    const params = sanitizeQuery({ planType: sanitizeOptionalString(options?.planType, { fieldName: 'planType', maxLength: 50 }) });

    try {
      const response = await api.get<ApiResponse<{ limits: { used: number; limit: number; percentage: number; nearingLimit: boolean } }>>(
        `${BASE_PATH}/plan-limits`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to check plan limits', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/plan-limits`, params),
      );
    }
  },

  /**
   * Get average processing time.
   * GET /certificates/account/average-processing-time
   */
  async getAverageProcessingTime(): Promise<{ averageTimeMs: number }> {
    try {
      const response = await api.get<ApiResponse<{ averageTimeMs: number }>>(
        `${BASE_PATH}/average-processing-time`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch processing time', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/average-processing-time`),
      );
    }
  },

  /**
   * Get success rate.
   * GET /certificates/account/success-rate
   */
  async getSuccessRate(options?: { days?: number }): Promise<{ successRate: number }> {
    const params = sanitizeQuery({
      days: options?.days !== undefined ? sanitizeDays(options.days, 'days') : undefined,
    });

    try {
      const response = await api.get<ApiResponse<{ successRate: number }>>(
        `${BASE_PATH}/success-rate`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch success rate', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/success-rate`, params),
      );
    }
  },

  /**
   * Get transfer statistics.
   * GET /certificates/account/transfer-statistics
   */
  async getTransferStatistics(options?: { includeSuccessRate?: boolean; includeAverageTime?: boolean }): Promise<{
    statistics: {
      total: number;
      successful: number;
      failed: number;
      pending: number;
      successRate: number;
      averageTime: number;
    };
  }> {
    const params = sanitizeQuery({
      includeSuccessRate: sanitizeOptionalBoolean(options?.includeSuccessRate, 'includeSuccessRate'),
      includeAverageTime: sanitizeOptionalBoolean(options?.includeAverageTime, 'includeAverageTime'),
    });

    try {
      const response = await api.get<ApiResponse<{ statistics: { total: number; successful: number; failed: number; pending: number; successRate: number; averageTime: number } }>>(
        `${BASE_PATH}/transfer-statistics`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer statistics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/transfer-statistics`, params),
      );
    }
  },

  /**
   * Get global transfer analytics.
   * GET /certificates/account/global-analytics
   */
  async getGlobalTransferAnalytics(): Promise<{ analytics: any }> {
    try {
      const response = await api.get<ApiResponse<{ analytics: any }>>(
        `${BASE_PATH}/global-analytics`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch global analytics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/global-analytics`),
      );
    }
  },

  /**
   * Get ownership status.
   * GET /certificates/account/:certificateId/ownership-status
   */
  async getOwnershipStatus(certificateId: string): Promise<{ ownershipStatus: OwnershipStatus }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      const response = await api.get<ApiResponse<{ ownershipStatus: OwnershipStatus }>>(
        `${BASE_PATH}/${id}/ownership-status`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch ownership status', 404);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/:certificateId/ownership-status`, {
          certificateId: id,
        }),
      );
    }
  },

  /**
   * Get transfer health.
   * GET /certificates/account/:certificateId/transfer-health
   */
  async getTransferHealth(certificateId: string): Promise<{ transferHealth: TransferHealth }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      const response = await api.get<ApiResponse<{ transferHealth: TransferHealth }>>(
        `${BASE_PATH}/${id}/transfer-health`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer health', 404);
    } catch (error) {
      throw handleApiError(
        error,
        createAccountLogContext('GET', `${BASE_PATH}/:certificateId/transfer-health`, {
          certificateId: id,
        }),
      );
    }
  },
};

export default certificateAccountApi;

