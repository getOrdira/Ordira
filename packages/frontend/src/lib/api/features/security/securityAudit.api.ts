// src/lib/api/features/security/securityAudit.api.ts
// Security audit API aligned with backend routes/features/security/securityAudit.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityAuditHistoryResponse,
  SecurityAuditMetricsResponse,
  SecurityAuditRequestResponse,
  SecurityAuditResult
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalNumber } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/audit';

type HttpMethod = 'GET' | 'POST';

const createSecurityAuditLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'audit',
  method,
  endpoint,
  ...context
});

export interface AuditHistoryQuery {
  limit?: number;
}

export interface SecurityMetricsQuery {
  days?: number;
}

const sanitizeAuditHistoryQuery = (query?: AuditHistoryQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    limit: sanitizeOptionalNumber(query.limit, 'limit', {
      integer: true,
      min: 1,
      max: 100
    })
  });
};

const sanitizeSecurityMetricsQuery = (query?: SecurityMetricsQuery) => {
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

export const securityAuditApi = {
  /**
   * Perform a comprehensive security audit.
   * POST /api/security/audit/perform
   */
  async performSecurityAudit(): Promise<SecurityAuditResult> {
    const endpoint = `${BASE_PATH}/perform`;

    try {
      const response = await api.post<ApiResponse<{ audit: SecurityAuditResult }>>(endpoint);
      const { audit } = baseApi.handleResponse(
        response,
        'Failed to perform security audit',
        500
      );
      return audit;
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAuditLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Generate a security report in markdown format.
   * GET /api/security/audit/report
   */
  async generateSecurityReport(): Promise<string> {
    const endpoint = `${BASE_PATH}/report`;

    try {
      const response = await api.get<string>(endpoint, {
        responseType: 'text'
      });
      return response as unknown as string;
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAuditLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Audit the current request and return discovered issues.
   * POST /api/security/audit/request
   */
  async auditRequest(): Promise<SecurityAuditRequestResponse> {
    const endpoint = `${BASE_PATH}/request`;

    try {
      const response = await api.post<ApiResponse<SecurityAuditRequestResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to audit request',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAuditLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Retrieve recent security audit history.
   * GET /api/security/audit/history
   */
  async getAuditHistory(query?: AuditHistoryQuery): Promise<SecurityAuditHistoryResponse> {
    const endpoint = `${BASE_PATH}/history`;
    const params = sanitizeAuditHistoryQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityAuditHistoryResponse>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch security audit history',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAuditLogContext('GET', endpoint, {
          limit: query?.limit
        })
      );
    }
  },

  /**
   * Retrieve system security metrics aggregated over a timeframe.
   * GET /api/security/audit/metrics
   */
  async getSecurityMetrics(query?: SecurityMetricsQuery): Promise<SecurityAuditMetricsResponse> {
    const endpoint = `${BASE_PATH}/metrics`;
    const params = sanitizeSecurityMetricsQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityAuditMetricsResponse>>(endpoint, {
        params
      });

      return baseApi.handleResponse(
        response,
        'Failed to fetch security metrics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityAuditLogContext('GET', endpoint, {
          days: query?.days
        })
      );
    }
  }
};

export default securityAuditApi;

