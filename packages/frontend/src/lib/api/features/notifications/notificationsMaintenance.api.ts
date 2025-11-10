// src/lib/api/features/notifications/notificationsMaintenance.api.ts
// Notifications maintenance API aligned with backend routes/features/notifications/notificationsMaintenance.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalNumber } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/notifications/maintenance';

type HttpMethod = 'POST';

const createNotificationsMaintenanceLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'maintenance',
  method,
  endpoint,
  ...context
});

export interface NotificationCleanupOptions {
  daysToKeep?: number;
}

export interface NotificationCleanupResult {
  deleted: number;
  retentionDays: number;
}

const sanitizeCleanupQuery = (options?: NotificationCleanupOptions) => {
  if (!options) {
    return undefined;
  }

  const daysToKeep = sanitizeOptionalNumber(options.daysToKeep, 'daysToKeep', {
    integer: true,
    min: 1,
    max: 365
  });

  return baseApi.sanitizeQueryParams({
    daysToKeep
  });
};

export const notificationsMaintenanceApi = {
  /**
   * Cleanup old notifications based on retention window.
   * POST /api/notifications/maintenance/cleanup
   */
  async cleanupOldNotifications(options?: NotificationCleanupOptions): Promise<NotificationCleanupResult> {
    const endpoint = `${BASE_PATH}/cleanup`;
    const params = sanitizeCleanupQuery(options);

    try {
      const response = await api.post<ApiResponse<NotificationCleanupResult>>(endpoint, undefined, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to cleanup notifications',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsMaintenanceLogContext('POST', endpoint, {
          retentionProvided: Boolean(params?.daysToKeep)
        })
      );
    }
  }
};

export default notificationsMaintenanceApi;
