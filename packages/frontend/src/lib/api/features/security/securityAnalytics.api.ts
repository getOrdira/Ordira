// src/lib/api/features/security/securityAnalytics.api.ts
// Security analytics API aligned with backend routes/features/security/securityAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityActorType,
  SecurityAuditReportResponse,
  SystemSecurityMetricsResponse,
  SuspiciousActivityResponse
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/analytics';

type HttpMethod = 'GET' | 'POST';

const SECURITY_ACTOR_TYPES: readonly SecurityActorType[] = ['business', 'user', 'manufacturer'] as const;
const IP_ADDRESS_REGEX =
  /^(?:\d{1,3}\.){3}\d{1,3}$|^(?:[A-Fa-f0-9:]+:+[A-Fa-f0-9]+)$/;

const createSecurityAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

export interface SuspiciousActivityPayload {
  userId?: string;
  userType?: SecurityActorType;
  ipAddress?: string;
}

export interface AuditReportQuery {
  userId?: string;
  days?: number;
}

export interface SystemMetricsQuery {
  days?: number;
}

const sanitizeSuspiciousActivityPayload = (payload: SuspiciousActivityPayload) => {
  return baseApi.sanitizeRequestData({
    userId: sanitizeOptionalObjectId(payload.userId, 'userId'),
    userType: sanitizeOptionalEnum(payload.userType, 'userType', SECURITY_ACTOR_TYPES),
    ipAddress: sanitizeOptionalString(payload.ipAddress, 'ipAddress', {
      pattern: IP_ADDRESS_REGEX,
      trim: true
    })
  });
};

const sanitizeAuditReportQuery = (query?: AuditReportQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizeOptionalObjectId(query.userId, 'userId'),
    days: sanitizeOptionalNumber(query.days, 'days', {
      integer: true,
      min: 1,
      max: 365
    })
  });
};

const sanitizeSystemMetricsQuery = (query?: SystemMetricsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    days: sanitizeOptionalNumber(query.days, 'days', {
      integer: true,
      min: 1,
      max: 90
    })
  });
};

export const securityAnalyticsApi = {
  /**
   * Detect suspicious activity for a given user context.
   * POST /api/security/analytics/detect-suspicious
   */
  async detectSuspiciousActivity(payload: SuspiciousActivityPayload): Promise<SuspiciousActivityResponse> {
    const endpoint = `${BASE_PATH}/detect-suspicious`;
    const sanitizedPayload = sanitizeSuspiciousActivityPayload(payload);

    try {
      const response = await api.post<ApiResponse<SuspiciousActivityResponse>>(
        endpoint,
        sanitizedPayload
      );

      return baseApi.handleResponse(
        response,
        'Failed to evaluate suspicious activity',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAnalyticsLogContext('POST', endpoint, {
          hasUserContext: Boolean(sanitizedPayload.userId),
          hasIp: Boolean(sanitizedPayload.ipAddress)
        })
      );
    }
  },

  /**
   * Retrieve a security audit report for a user.
   * GET /api/security/analytics/audit-report
   */
  async getSecurityAuditReport(query?: AuditReportQuery): Promise<SecurityAuditReportResponse> {
    const endpoint = `${BASE_PATH}/audit-report`;
    const params = sanitizeAuditReportQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityAuditReportResponse>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch security audit report',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAnalyticsLogContext('GET', endpoint, {
          hasUserContext: Boolean(query?.userId),
          days: query?.days
        })
      );
    }
  },

  /**
   * Retrieve system security metrics across a time window.
   * GET /api/security/analytics/metrics
   */
  async getSystemSecurityMetrics(query?: SystemMetricsQuery): Promise<SystemSecurityMetricsResponse> {
    const endpoint = `${BASE_PATH}/metrics`;
    const params = sanitizeSystemMetricsQuery(query);

    try {
      const response = await api.get<ApiResponse<SystemSecurityMetricsResponse>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch system security metrics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAnalyticsLogContext('GET', endpoint, {
          days: query?.days
        })
      );
    }
  }
};

export default securityAnalyticsApi;

