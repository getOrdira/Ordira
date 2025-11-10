// src/lib/api/features/security/securityScanning.api.ts
// Security scanning API aligned with backend routes/features/security/securityScanning.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SecurityScanExecutionResponse,
  SecurityScanHistoryResponse,
  SecurityScanMetricsResponse,
  SecurityScanResult,
  SecurityScanStatusResponse,
  SecurityVulnerabilitiesResponse
} from '@/lib/types/features/security';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalNumber } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/security/scanning';

type HttpMethod = 'GET' | 'POST';

const createSecurityScanningLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'security',
  module: 'scanning',
  method,
  endpoint,
  ...context
});

export interface ScanHistoryQuery {
  limit?: number;
}

const sanitizeScanHistoryQuery = (query?: ScanHistoryQuery) => {
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

export const securityScanningApi = {
  /**
   * Trigger a security scan.
   * POST /api/security/scanning/perform
   */
  async performSecurityScan(): Promise<SecurityScanExecutionResponse> {
    const endpoint = `${BASE_PATH}/perform`;

    try {
      const response = await api.post<ApiResponse<SecurityScanExecutionResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to perform security scan',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityScanningLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Retrieve aggregated security scan metrics.
   * GET /api/security/scanning/metrics
   */
  async getSecurityScanMetrics(): Promise<SecurityScanMetricsResponse> {
    const endpoint = `${BASE_PATH}/metrics`;

    try {
      const response = await api.get<ApiResponse<SecurityScanMetricsResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch security scan metrics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityScanningLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve recent scan history.
   * GET /api/security/scanning/history
   */
  async getScanHistory(query?: ScanHistoryQuery): Promise<SecurityScanHistoryResponse> {
    const endpoint = `${BASE_PATH}/history`;
    const params = sanitizeScanHistoryQuery(query);

    try {
      const response = await api.get<ApiResponse<SecurityScanHistoryResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch security scan history',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityScanningLogContext('GET', endpoint, { limit: query?.limit })
      );
    }
  },

  /**
   * Retrieve unresolved security vulnerabilities.
   * GET /api/security/scanning/vulnerabilities
   */
  async getUnresolvedVulnerabilities(): Promise<SecurityVulnerabilitiesResponse> {
    const endpoint = `${BASE_PATH}/vulnerabilities`;

    try {
      const response = await api.get<ApiResponse<SecurityVulnerabilitiesResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch unresolved vulnerabilities',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityScanningLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve current scan status.
   * GET /api/security/scanning/status
   */
  async getScanStatus(): Promise<SecurityScanStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;

    try {
      const response = await api.get<ApiResponse<SecurityScanStatusResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch security scan status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSecurityScanningLogContext('GET', endpoint)
      );
    }
  }
};

export default securityScanningApi;





