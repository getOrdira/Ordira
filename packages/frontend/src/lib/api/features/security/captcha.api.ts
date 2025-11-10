// src/lib/api/features/security/captcha.api.ts
// Captcha API aligned with backend routes/features/security/captcha.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CaptchaStatus,
  CaptchaVerificationResponse
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/captcha';

type HttpMethod = 'GET' | 'POST';

const createCaptchaLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'captcha',
  method,
  endpoint,
  ...context
});

export interface CaptchaVerifyPayload {
  token?: string;
  action?: string;
  bypassToken?: string;
  failureCount?: number;
  metadata?: Record<string, unknown>;
}

const sanitizeVerifyPayload = (payload: CaptchaVerifyPayload) => {
  return baseApi.sanitizeRequestData({
    token: sanitizeOptionalString(payload.token, 'token', { maxLength: 2048, trim: true }),
    action: sanitizeOptionalString(payload.action, 'action', { maxLength: 100, trim: true }),
    bypassToken: sanitizeOptionalString(payload.bypassToken, 'bypassToken', { maxLength: 500, trim: true }),
    failureCount: sanitizeOptionalNumber(payload.failureCount, 'failureCount', {
      integer: true,
      min: 0
    }),
    metadata: sanitizeOptionalJsonObject(payload.metadata, 'metadata')
  });
};

export const captchaApi = {
  /**
   * Verify a captcha token against the backend validation service.
   * POST /api/security/captcha/verify
   */
  async verifyCaptcha(payload: CaptchaVerifyPayload): Promise<CaptchaVerificationResponse> {
    const endpoint = `${BASE_PATH}/verify`;
    const sanitizedPayload = sanitizeVerifyPayload(payload);

    try {
      const response = await api.post<ApiResponse<CaptchaVerificationResponse>>(
        endpoint,
        sanitizedPayload
      );

      return baseApi.handleResponse(
        response,
        'Failed to verify captcha token',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createCaptchaLogContext('POST', endpoint, {
          hasToken: Boolean(sanitizedPayload.token),
          action: sanitizedPayload.action
        })
      );
    }
  },

  /**
   * Retrieve captcha configuration status for the current environment.
   * GET /api/security/captcha/status
   */
  async getCaptchaStatus(): Promise<CaptchaStatus> {
    const endpoint = `${BASE_PATH}/status`;

    try {
      const response = await api.get<ApiResponse<CaptchaStatus>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch captcha status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createCaptchaLogContext('GET', endpoint)
      );
    }
  }
};

export default captchaApi;

