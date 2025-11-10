// src/lib/api/features/domains/domainHealth.api.ts
// Domain health API module aligned with backend routes/features/domains/domainHealth.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  DomainHealthCheckOptions,
  DomainHealthReport
} from '@backend/services/domains/features/domainHealth.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/domain-mappings/health';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createHealthLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'domains',
  module: 'health',
  method,
  endpoint,
  ...context
});

const buildHealthPayload = (options?: DomainHealthCheckOptions) => {
  const timeoutMs = sanitizeOptionalNumber(options?.timeoutMs, 'timeoutMs', {
    integer: true,
    min: 1000,
    max: 60000
  });
  const includeDns = sanitizeOptionalBoolean(options?.includeDns, 'includeDns');
  const includeHttp = sanitizeOptionalBoolean(options?.includeHttp, 'includeHttp');
  const includeSsl = sanitizeOptionalBoolean(options?.includeSsl, 'includeSsl');

  const body = baseApi.sanitizeRequestData({
    timeoutMs,
    includeDns,
    includeHttp,
    includeSsl
  });

  const query = baseApi.sanitizeQueryParams({
    timeoutMs,
    includeDns,
    includeHttp,
    includeSsl
  });

  return { body, query };
};

export const domainHealthApi = {
  /**
   * Run a health check for a domain mapping.
   * POST /domain-mappings/health/:domainId/check
   */
  async runHealthCheck(
    domainId: string,
    options?: DomainHealthCheckOptions
  ): Promise<DomainHealthReport> {
    const id = sanitizeObjectId(domainId, 'domainId');

    try {
      const { body, query } = buildHealthPayload(options);
      const response = await api.post<ApiResponse<{ report: DomainHealthReport }>>(
        `${BASE_PATH}/${id}/check`,
        body,
        { params: query }
      );
      const { report } = baseApi.handleResponse(
        response,
        'Failed to execute domain health check',
        500
      );
      return report;
    } catch (error) {
      throw handleApiError(
        error,
        createHealthLogContext('POST', `${BASE_PATH}/:domainId/check`, {
          domainId: id,
          options
        })
      );
    }
  }
};

export default domainHealthApi;
