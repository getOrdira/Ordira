// src/lib/api/features/brands/brandVerification.api.ts
// Brand verification API aligned with backend routes/features/brands/brandVerification.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandVerificationEmailResult,
  BrandVerificationHistoryEntry,
  BrandVerificationSendEmailResult,
  BrandVerificationStatistics,
  BrandVerificationSubmissionResult,
  DetailedVerificationStatus,
  VerificationStatus
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand/verification';

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

const sanitizeStatisticsParams = (params?: VerificationStatisticsParams) => {
  if (!params) {
    return undefined;
  }
  return baseApi.sanitizeQueryParams({ ...params } as Record<string, unknown>);
};

export interface VerificationDocumentsPayload {
  businessLicense?: string;
  taxId?: string;
  businessRegistration?: string;
  bankStatement?: string;
  identityDocument?: string;
  additionalDocuments?: string[];
}

export interface BusinessVerificationStatusUpdate {
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  reviewerId?: string;
}

export interface VerificationStatisticsParams {
  timeframe?: string;
  status?: string;
}

export const brandVerificationApi = {
  /**
   * Retrieve verification status.
   * GET /api/brand/verification/status
   */
  async getStatus(): Promise<VerificationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: VerificationStatus }>>(
        `${BASE_PATH}/status`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch verification status',
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
   * Submit verification documents.
   * POST /api/brand/verification/submit
   */
  async submitVerification(
    payload: VerificationDocumentsPayload,
  ): Promise<BrandVerificationSubmissionResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandVerificationSubmissionResult }>>(
        `${BASE_PATH}/submit`,
        baseApi.sanitizeRequestData(payload),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to submit verification documents',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/submit`, {
          submittedFields: Object.keys(payload ?? {})
        }),
      );
    }
  },

  /**
   * Retrieve detailed verification status.
   * GET /api/brand/verification/status/detail
   */
  async getDetailedStatus(): Promise<DetailedVerificationStatus> {
    try {
      const response = await api.get<ApiResponse<{ status: DetailedVerificationStatus }>>(
        `${BASE_PATH}/status/detail`,
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch detailed verification status',
        500,
      );
      return status;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/status/detail`),
      );
    }
  },

  /**
   * Retrieve verification history.
   * GET /api/brand/verification/history
   */
  async getHistory(): Promise<BrandVerificationHistoryEntry[]> {
    try {
      const response = await api.get<ApiResponse<{ history: BrandVerificationHistoryEntry[] }>>(
        `${BASE_PATH}/history`,
      );
      const { history } = baseApi.handleResponse(
        response,
        'Failed to fetch verification history',
        500,
      );
      return history;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/history`),
      );
    }
  },

  /**
   * Verify email using a code.
   * POST /api/brand/verification/email/verify
   */
  async verifyEmail(verificationCode: string): Promise<BrandVerificationEmailResult> {
    try {
      if (!verificationCode?.trim()) {
        throw new ApiError('Verification code is required', 400, 'VALIDATION_ERROR');
      }
      const response = await api.post<ApiResponse<{ result: BrandVerificationEmailResult }>>(
        `${BASE_PATH}/email/verify`,
        baseApi.sanitizeRequestData({ verificationCode }),
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to verify email',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/email/verify`),
      );
    }
  },

  /**
   * Send email verification code.
   * POST /api/brand/verification/email/send
   */
  async sendEmailVerification(): Promise<BrandVerificationSendEmailResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandVerificationSendEmailResult }>>(
        `${BASE_PATH}/email/send`,
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to send verification email',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/email/send`),
      );
    }
  },

  /**
   * Update business verification status.
   * PATCH /api/brand/verification/business/status
   */
  async updateBusinessStatus(payload: BusinessVerificationStatusUpdate): Promise<string> {
    try {
      const response = await api.patch<ApiResponse<{ message: string }>>(
        `${BASE_PATH}/business/status`,
        baseApi.sanitizeRequestData(payload),
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to update business verification status',
        400,
      );
      return message;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('PATCH', `${BASE_PATH}/business/status`, {
          status: payload?.status,
        }),
      );
    }
  },

  /**
   * Retrieve verification statistics.
   * GET /api/brand/verification/statistics
   */
  async getStatistics(
    params?: VerificationStatisticsParams,
  ): Promise<BrandVerificationStatistics> {
    try {
      const response = await api.get<ApiResponse<{ stats: BrandVerificationStatistics }>>(
        `${BASE_PATH}/statistics`,
        { params: sanitizeStatisticsParams(params) },
      );
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch verification statistics',
        500,
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/statistics`, params ? { ...params } : undefined),
      );
    }
  },
};

export default brandVerificationApi;


