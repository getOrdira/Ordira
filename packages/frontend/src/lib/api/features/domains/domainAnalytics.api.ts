// src/lib/api/features/domains/domainAnalytics.api.ts
// Domain analytics API module aligned with backend routes/features/domains/domainAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { DomainAnalyticsReport } from '@backend/services/domains/features/domainAnalytics.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/analytics';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

const TIMEFRAME_VALUES = ['24h', '7d', '30d', '90d', '1y', 'all'] as const;

export type DomainAnalyticsTimeframe = typeof TIMEFRAME_VALUES[number];

export interface DomainAnalyticsQueryOptions {
  timeframe?: DomainAnalyticsTimeframe;
  useCache?: boolean;
  includePerformance?: boolean;
  includeErrors?: boolean;
  includeTraffic?: boolean;
}

export interface DomainAccessRecordPayload {
  domainName: string;
  statusCode?: number;
  latencyMs?: number;
  visitorIdentifier?: string;
}

export interface DomainAnalyticsResetResult {
  businessId: string;
  domainId: string;
  reset: boolean;
}

const buildAnalyticsQuery = (params?: DomainAnalyticsQueryOptions) => {
  if (!params) {
    return undefined;
  }

  const query = {
    timeframe: sanitizeOptionalEnum(params.timeframe, 'timeframe', TIMEFRAME_VALUES),
    useCache: sanitizeOptionalBoolean(params.useCache, 'useCache'),
    includePerformance: sanitizeOptionalBoolean(params.includePerformance, 'includePerformance'),
    includeErrors: sanitizeOptionalBoolean(params.includeErrors, 'includeErrors'),
    includeTraffic: sanitizeOptionalBoolean(params.includeTraffic, 'includeTraffic')
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const sanitizeRecordAccessPayload = (payload: DomainAccessRecordPayload) => {
  const domainName = sanitizeString(payload.domainName, 'domainName', {
    minLength: 3,
    maxLength: 253,
    trim: true,
    toLowerCase: true
  });
  const statusCode = sanitizeOptionalNumber(payload.statusCode, 'statusCode', {
    integer: true,
    min: 100,
    max: 599
  });
  const latencyMs = sanitizeOptionalNumber(payload.latencyMs, 'latencyMs', {
    integer: true,
    min: 0
  });
  const visitorIdentifier = sanitizeOptionalString(payload.visitorIdentifier, 'visitorIdentifier', {
    maxLength: 128,
    trim: true
  });

  return baseApi.sanitizeRequestData({
    domainName,
    statusCode,
    latencyMs,
    visitorIdentifier
  });
};

export const domainAnalyticsApi = {
  /**
   * Retrieve analytics report for a domain mapping.
   * GET /domains/analytics/:domainId
   */
  async getDomainAnalytics(
    domainId: string,
    options?: DomainAnalyticsQueryOptions
  ): Promise<DomainAnalyticsReport> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const query = buildAnalyticsQuery(options);
      const response = await api.get<ApiResponse<{ report: DomainAnalyticsReport }>>(
        `${BASE_PATH}/${id}`,
        { params: query }
      );
      const { report } = baseApi.handleResponse(
        response,
        'Failed to fetch domain analytics',
        500
      );
      return report;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/:domainId`, { domainId: id, options })
      );
    }
  },

  /**
   * Record a domain access event.
   * POST /domains/analytics/record-access
   */
  async recordDomainAccess(payload: DomainAccessRecordPayload): Promise<{ domain: string; recorded: boolean }> {
    try {
      const sanitizedPayload = sanitizeRecordAccessPayload(payload);
      const response = await api.post<ApiResponse<{ domain: string; recorded: boolean }>>(
        `${BASE_PATH}/record-access`,
        sanitizedPayload
      );
      const result = baseApi.handleResponse(
        response,
        'Failed to record domain access',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('POST', `${BASE_PATH}/record-access`, {
          domainName: payload.domainName
        })
      );
    }
  },

  /**
   * Reset analytics counters for a domain mapping.
   * POST /domains/analytics/:domainId/reset
   */
  async resetDomainAnalytics(domainId: string): Promise<DomainAnalyticsResetResult> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const response = await api.post<ApiResponse<DomainAnalyticsResetResult>>(
        `${BASE_PATH}/${id}/reset`
      );
      const result = baseApi.handleResponse(
        response,
        'Failed to reset domain analytics',
        400
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('POST', `${BASE_PATH}/:domainId/reset`, { domainId: id })
      );
    }
  }
};

export default domainAnalyticsApi;
