// src/lib/api/features/domains/domainVerification.api.ts
// Domain verification API module aligned with backend routes/features/domains/domainVerification.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  VerificationInitiationOptions,
  VerificationMethod,
  VerificationResult,
  VerificationStatus
} from '@backend/services/domains/features/domainVerification.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/verification';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createVerificationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'verification',
  method,
  endpoint,
  ...context
});

const VERIFICATION_METHODS = ['dns'] as const;

export interface MarkVerifiedOptions {
  verifiedBy?: string;
}

export interface VerificationRequestOptions extends VerificationInitiationOptions {}

export interface VerifyDomainOptions {
  requestedBy?: string;
}

export interface ScheduleRecheckOptions {
  method?: VerificationMethod;
}

export interface MarkVerifiedResponse {
  businessId: string;
  domainId: string;
  verified: boolean;
}

export interface ScheduleRecheckResponse {
  businessId: string;
  domainId: string;
  scheduled: boolean;
}

const sanitizeRequestedBy = (value?: string) =>
  sanitizeOptionalString(value, 'requestedBy', {
    maxLength: 128,
    trim: true
  });

const sanitizeVerifiedBy = (value?: string) =>
  sanitizeOptionalString(value, 'verifiedBy', {
    maxLength: 128,
    trim: true
  });

const buildInitiationPayload = (options?: VerificationRequestOptions) => {
  const method = sanitizeOptionalEnum(options?.method, 'method', VERIFICATION_METHODS);
  const requestedBy = sanitizeRequestedBy(options?.requestedBy);
  const autoScheduleRecheck = sanitizeOptionalBoolean(options?.autoScheduleRecheck, 'autoScheduleRecheck');

  return baseApi.sanitizeRequestData({
    method,
    requestedBy,
    autoScheduleRecheck
  });
};

const buildScheduleRecheckPayload = (options?: ScheduleRecheckOptions) =>
  baseApi.sanitizeRequestData({
    method: sanitizeOptionalEnum(options?.method, 'method', VERIFICATION_METHODS)
  });

export const domainVerificationApi = {
  /**
   * Initiate verification for a domain mapping.
   * POST /domain-mappings/verification/:domainId/initiate
   */
  async initiateVerification(
    domainId: string,
    options?: VerificationRequestOptions
  ): Promise<VerificationStatus> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildInitiationPayload(options);
      const response = await api.post<ApiResponse<{ status: VerificationStatus }>>(
        `${BASE_PATH}/${id}/initiate`,
        payload
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to initiate domain verification',
        400
      );
      return status;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', `${BASE_PATH}/:domainId/initiate`, {
          domainId: id,
          options
        })
      );
    }
  },

  /**
   * Verify domain configuration.
   * POST /domain-mappings/verification/:domainId/verify
   */
  async verifyDomain(domainId: string, options?: VerifyDomainOptions): Promise<VerificationResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const requestedBy = sanitizeRequestedBy(options?.requestedBy);
      const body = baseApi.sanitizeRequestData({ requestedBy });
      const query = baseApi.sanitizeQueryParams({ requestedBy });

      const response = await api.post<ApiResponse<{ result: VerificationResult }>>(
        `${BASE_PATH}/${id}/verify`,
        body,
        { params: query }
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to verify domain',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', `${BASE_PATH}/:domainId/verify`, {
          domainId: id,
          requestedBy: options?.requestedBy
        })
      );
    }
  },

  /**
   * Mark a domain as verified manually.
   * POST /domain-mappings/verification/:domainId/mark-verified
   */
  async markVerified(domainId: string, options?: MarkVerifiedOptions): Promise<MarkVerifiedResponse> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const verifiedBy = sanitizeVerifiedBy(options?.verifiedBy);
      const body = baseApi.sanitizeRequestData({ verifiedBy });
      const query = baseApi.sanitizeQueryParams({ verifiedBy });

      const response = await api.post<ApiResponse<MarkVerifiedResponse>>(
        `${BASE_PATH}/${id}/mark-verified`,
        body,
        { params: query }
      );
      return baseApi.handleResponse(
        response,
        'Failed to mark domain as verified',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', `${BASE_PATH}/:domainId/mark-verified`, {
          domainId: id,
          verifiedBy: options?.verifiedBy
        })
      );
    }
  },

  /**
   * Retrieve verification status for a domain.
   * GET /domain-mappings/verification/:domainId/status
   */
  async getVerificationStatus(domainId: string): Promise<VerificationStatus> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.get<ApiResponse<{ status: VerificationStatus }>>(
        `${BASE_PATH}/${id}/status`
      );
      const { status } = baseApi.handleResponse(
        response,
        'Failed to fetch domain verification status',
        500
      );
      return status;
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('GET', `${BASE_PATH}/:domainId/status`, { domainId: id })
      );
    }
  },

  /**
   * Schedule a verification recheck job.
   * POST /domain-mappings/verification/:domainId/schedule-recheck
   */
  async scheduleVerificationRecheck(
    domainId: string,
    options?: ScheduleRecheckOptions
  ): Promise<ScheduleRecheckResponse> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const payload = buildScheduleRecheckPayload(options);
      const response = await api.post<ApiResponse<ScheduleRecheckResponse>>(
        `${BASE_PATH}/${id}/schedule-recheck`,
        payload,
        {
          params: baseApi.sanitizeQueryParams(payload)
        }
      );
      return baseApi.handleResponse(
        response,
        'Failed to schedule verification recheck',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createVerificationLogContext('POST', `${BASE_PATH}/:domainId/schedule-recheck`, {
          domainId: id,
          options
        })
      );
    }
  }
};

export default domainVerificationApi;
