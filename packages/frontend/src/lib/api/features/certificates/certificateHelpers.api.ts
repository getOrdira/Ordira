// src/lib/api/features/certificates/certificateHelpers.api.ts
// Certificate helpers API aligned with backend routes/features/certificates/certificateHelpers.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { TransferUsage } from '@backend/services/certificates/core';
import {
  ensureNonEmptyObject,
  logDebug,
  logError,
  sanitizeBoolean,
  sanitizeContactMethod,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizePlan,
  sanitizePositiveInteger,
  sanitizeQuery,
  sanitizeRecipientByContactMethod,
  sanitizeString,
} from './utils';

const BASE_PATH = '/certificates/helpers';

const sanitizeMonthlyStats = (monthlyStats: Array<{ month: string; transfers: number }>): Array<{ month: string; transfers: number }> => {
  if (!Array.isArray(monthlyStats) || monthlyStats.length === 0) {
    throw new Error('monthlyStats must be a non-empty array');
  }

  if (monthlyStats.length > 36) {
    throw new Error('monthlyStats cannot contain more than 36 entries');
  }

  return monthlyStats.map((entry, index) => ({
    month: sanitizeString(entry.month, { fieldName: `monthlyStats[${index}].month`, maxLength: 20 }),
    transfers: sanitizePositiveInteger(entry.transfers, { fieldName: `monthlyStats[${index}].transfers`, min: 0, max: 1_000_000 }),
  }));
};

export const certificateHelpersApi = {
  /**
   * Validate recipient.
   * POST /certificates/helpers/validate-recipient
   */
  async validateRecipient(recipient: string, contactMethod: 'email' | 'sms' | 'wallet'): Promise<{ validation: { valid: boolean; error?: string } }> {
    const sanitizedMethod = sanitizeContactMethod(contactMethod);
    const sanitizedRecipient = sanitizeRecipientByContactMethod(recipient, sanitizedMethod);

    try {
      logDebug('helpers', 'Validating recipient', { contactMethod: sanitizedMethod });
      const response = await api.post<ApiResponse<{ validation: { valid: boolean; error?: string } }>>(
        `${BASE_PATH}/validate-recipient`,
        {
          recipient: sanitizedRecipient,
          contactMethod: sanitizedMethod,
        },
      );

      return baseApi.handleResponse(response, 'Failed to validate recipient', 500);
    } catch (error) {
      logError('helpers', 'Validate recipient request failed', error);
      throw error;
    }
  },

  /**
   * Validate product ownership.
   * POST /certificates/helpers/validate-product-ownership
   */
  async validateProductOwnership(productId: string): Promise<{ isValid: boolean }> {
    const id = sanitizeObjectId(productId, 'productId');

    try {
      logDebug('helpers', 'Validating product ownership', { productId: id });
      const response = await api.post<ApiResponse<{ isValid: boolean }>>(
        `${BASE_PATH}/validate-product-ownership`,
        { productId: id },
      );

      return baseApi.handleResponse(response, 'Failed to validate product ownership', 500);
    } catch (error) {
      logError('helpers', 'Validate product ownership request failed', error);
      throw error;
    }
  },

  /**
   * Get ownership status.
   * GET /certificates/helpers/:certificateId/ownership-status
   */
  async getOwnershipStatus(certificateId: string): Promise<{ ownershipStatus: string }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('helpers', 'Fetching ownership status', { certificateId: id });
      const response = await api.get<ApiResponse<{ ownershipStatus: string }>>(
        `${BASE_PATH}/${id}/ownership-status`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch ownership status', 404);
    } catch (error) {
      logError('helpers', 'Ownership status request failed', error);
      throw error;
    }
  },

  /**
   * Get transfer health.
   * GET /certificates/helpers/:certificateId/transfer-health
   */
  async getTransferHealth(certificateId: string): Promise<{ transferHealth: { status: string; score: number; issues: string[] } }> {
    const id = sanitizeObjectId(certificateId, 'certificateId');

    try {
      logDebug('helpers', 'Fetching transfer health', { certificateId: id });
      const response = await api.get<ApiResponse<{ transferHealth: { status: string; score: number; issues: string[] } }>>(
        `${BASE_PATH}/${id}/transfer-health`,
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer health', 404);
    } catch (error) {
      logError('helpers', 'Transfer health request failed', error);
      throw error;
    }
  },

  /**
   * Get certificate next steps.
   * POST /certificates/helpers/next-steps
   */
  async getCertificateNextSteps(payload: { hasWeb3: boolean; shouldAutoTransfer: boolean; transferScheduled: boolean }): Promise<{ nextSteps: string[] }> {
    const body = {
      hasWeb3: sanitizeBoolean(payload.hasWeb3, 'hasWeb3'),
      shouldAutoTransfer: sanitizeBoolean(payload.shouldAutoTransfer, 'shouldAutoTransfer'),
      transferScheduled: sanitizeBoolean(payload.transferScheduled, 'transferScheduled'),
    };

    try {
      logDebug('helpers', 'Fetching certificate next steps', body);
      const response = await api.post<ApiResponse<{ nextSteps: string[] }>>(
        `${BASE_PATH}/next-steps`,
        body,
      );

      return baseApi.handleResponse(response, 'Failed to fetch certificate next steps', 500);
    } catch (error) {
      logError('helpers', 'Certificate next steps request failed', error);
      throw error;
    }
  },

  /**
   * Get transfer usage.
   * GET /certificates/helpers/transfer-usage
   */
  async getTransferUsage(options?: { includeAnalytics?: boolean }): Promise<{ transferUsage: TransferUsage }> {
    const params = sanitizeQuery({
      includeAnalytics: sanitizeOptionalBoolean(options?.includeAnalytics, 'includeAnalytics'),
    });

    try {
      logDebug('helpers', 'Fetching transfer usage (helpers)', params);
      const response = await api.get<ApiResponse<{ transferUsage: TransferUsage }>>(
        `${BASE_PATH}/transfer-usage`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer usage', 500);
    } catch (error) {
      logError('helpers', 'Transfer usage request failed', error);
      throw error;
    }
  },

  /**
   * Get transfer limits.
   * GET /certificates/helpers/transfer-limits
   */
  async getTransferLimits(plan: string): Promise<{ limits: { transfersPerMonth: number; gasCreditsWei: string } }> {
    const params = sanitizeQuery({ plan: sanitizePlan(plan, 'plan') });

    try {
      logDebug('helpers', 'Fetching transfer limits', params);
      const response = await api.get<ApiResponse<{ limits: { transfersPerMonth: number; gasCreditsWei: string } }>>(
        `${BASE_PATH}/transfer-limits`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch transfer limits', 500);
    } catch (error) {
      logError('helpers', 'Transfer limits request failed', error);
      throw error;
    }
  },

  /**
   * Get plan limits.
   * GET /certificates/helpers/plan-limits
   */
  async getPlanLimits(plan: string): Promise<{ limits: { certificates: number; allowOverage: boolean; billPerCertificate: boolean; overageCost: number; hasWeb3: boolean } }> {
    const params = sanitizeQuery({ plan: sanitizePlan(plan, 'plan') });

    try {
      logDebug('helpers', 'Fetching plan limits', params);
      const response = await api.get<ApiResponse<{ limits: { certificates: number; allowOverage: boolean; billPerCertificate: boolean; overageCost: number; hasWeb3: boolean } }>>(
        `${BASE_PATH}/plan-limits`,
        { params },
      );

      return baseApi.handleResponse(response, 'Failed to fetch plan limits', 500);
    } catch (error) {
      logError('helpers', 'Plan limits request failed', error);
      throw error;
    }
  },

  /**
   * Estimate gas cost.
   * POST /certificates/helpers/calculate-gas-cost
   */
  async calculateEstimatedGasCost(recipientCount: number): Promise<{ estimatedCostWei: string }> {
    const sanitizedCount = sanitizePositiveInteger(recipientCount, { fieldName: 'recipientCount', min: 1, max: 5000 });

    try {
      logDebug('helpers', 'Calculating estimated gas cost', { recipientCount: sanitizedCount });
      const response = await api.post<ApiResponse<{ estimatedCostWei: string }>>(
        `${BASE_PATH}/calculate-gas-cost`,
        { recipientCount: sanitizedCount },
      );

      return baseApi.handleResponse(response, 'Failed to calculate gas cost', 500);
    } catch (error) {
      logError('helpers', 'Gas cost calculation request failed', error);
      throw error;
    }
  },

  /**
   * Calculate monthly growth.
   * POST /certificates/helpers/calculate-monthly-growth
   */
  async calculateMonthlyGrowth(monthlyStats: Array<{ month: string; transfers: number }>): Promise<{ growthPercentage: number }> {
    const sanitizedStats = sanitizeMonthlyStats(monthlyStats);

    try {
      logDebug('helpers', 'Calculating monthly growth', { count: sanitizedStats.length });
      const response = await api.post<ApiResponse<{ growthPercentage: number }>>(
        `${BASE_PATH}/calculate-monthly-growth`,
        { monthlyStats: sanitizedStats },
      );

      return baseApi.handleResponse(response, 'Failed to calculate monthly growth', 500);
    } catch (error) {
      logError('helpers', 'Monthly growth calculation failed', error);
      throw error;
    }
  },

  /**
   * Generate Web3 insights.
   * POST /certificates/helpers/generate-web3-insights
   */
  async generateWeb3Insights(payload: { certificateAnalytics: Record<string, unknown>; transferAnalytics: Record<string, unknown> }): Promise<{ insights: string[] }> {
    const body = ensureNonEmptyObject(payload, 'payload');

    try {
      logDebug('helpers', 'Generating Web3 insights');
      const response = await api.post<ApiResponse<{ insights: string[] }>>(
        `${BASE_PATH}/generate-web3-insights`,
        body,
      );

      return baseApi.handleResponse(response, 'Failed to generate Web3 insights', 500);
    } catch (error) {
      logError('helpers', 'Generate Web3 insights request failed', error);
      throw error;
    }
  },

  /**
   * Generate Web3 recommendations.
   * POST /certificates/helpers/generate-web3-recommendations
   */
  async generateWeb3Recommendations(payload: { certificateAnalytics: Record<string, unknown>; transferAnalytics: Record<string, unknown>; plan: string }): Promise<{ recommendations: string[] }> {
    const body = ensureNonEmptyObject({
      certificateAnalytics: payload.certificateAnalytics,
      transferAnalytics: payload.transferAnalytics,
      plan: sanitizePlan(payload.plan, 'plan') ?? payload.plan,
    }, 'payload');

    try {
      logDebug('helpers', 'Generating Web3 recommendations', { plan: body.plan });
      const response = await api.post<ApiResponse<{ recommendations: string[] }>>(
        `${BASE_PATH}/generate-web3-recommendations`,
        body,
      );

      return baseApi.handleResponse(response, 'Failed to generate Web3 recommendations', 500);
    } catch (error) {
      logError('helpers', 'Generate Web3 recommendations request failed', error);
      throw error;
    }
  },
};

export default certificateHelpersApi;

