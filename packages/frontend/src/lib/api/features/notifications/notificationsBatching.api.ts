// src/lib/api/features/notifications/notificationsBatching.api.ts
// Notifications batching API aligned with backend routes/features/notifications/notificationsBatching.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalDate } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/notifications/batching';

type HttpMethod = 'POST';

const createNotificationsBatchingLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'batching',
  method,
  endpoint,
  ...context
});

export interface NotificationDigestProcessOptions {
  referenceDate?: Date | string;
}

export interface NotificationDigestProcessResult {
  processedAt: string;
  referenceDate: string;
}

const sanitizeProcessQuery = (options?: NotificationDigestProcessOptions) => {
  if (!options) {
    return undefined;
  }

  const referenceDate = sanitizeOptionalDate(options.referenceDate, 'referenceDate');

  return baseApi.sanitizeQueryParams({
    referenceDate: referenceDate ? referenceDate.toISOString() : undefined
  });
};

export const notificationsBatchingApi = {
  /**
   * Process pending notification digests.
   * POST /api/notifications/batching/process-digests
   */
  async processPendingDigests(
    options?: NotificationDigestProcessOptions
  ): Promise<NotificationDigestProcessResult> {
    const endpoint = `${BASE_PATH}/process-digests`;
    const params = sanitizeProcessQuery(options);

    try {
      const response = await api.post<ApiResponse<NotificationDigestProcessResult>>(endpoint, undefined, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to process notification digests',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsBatchingLogContext('POST', endpoint, {
          hasReferenceDate: Boolean(params?.referenceDate)
        })
      );
    }
  }
};

export default notificationsBatchingApi;
