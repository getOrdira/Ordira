// src/lib/api/features/notifications/notificationsInbox.api.ts
// Notifications inbox API aligned with backend routes/features/notifications/notificationsInbox.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NotificationSummary,
  NotificationCategory,
  NotificationEventType
} from '@/lib/types/features/notifications';
import { NotificationCategory as NotificationCategoryEnum } from '@backend/services/notifications/types/notificationCategory';
import { NotificationPriority as NotificationPriorityEnum } from '@backend/services/notifications/types/notificationPriority';
import { NotificationEventType as NotificationEventTypeEnum } from '@backend/services/notifications/types/notificationEventType';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalString,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalEnum,
  sanitizeOptionalDate,
  sanitizeOptionalObjectId,
  sanitizeArray,
  sanitizeObjectId,
  sanitizeString,
  sanitizeOptionalUrl,
  sanitizeOptionalJsonObject
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/notifications';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const createNotificationsInboxLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'inbox',
  method,
  endpoint,
  ...context
});

const NOTIFICATION_CATEGORY_VALUES = Object.values(NotificationCategoryEnum) as readonly NotificationCategory[];
const NOTIFICATION_PRIORITY_VALUES = [
  ...Object.values(NotificationPriorityEnum),
  'normal'
] as const;
const NOTIFICATION_EVENT_TYPE_VALUES = Object.values(NotificationEventTypeEnum) as readonly NotificationEventType[];

type NotificationPriorityValue = typeof NOTIFICATION_PRIORITY_VALUES[number];

export interface NotificationListQuery {
  type?: string;
  category?: NotificationCategory | string;
  priority?: NotificationPriorityValue;
  read?: boolean;
  page?: number;
  limit?: number;
  dateFrom?: Date | string;
  dateTo?: Date | string;
}

export interface NotificationListResponse {
  notifications: NotificationSummary[];
  stats: NotificationInboxStats;
  pagination: NotificationPagination;
}

export interface NotificationInboxStats {
  total: number;
  unread: number;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NotificationCreateInput {
  businessId?: string;
  manufacturerId?: string;
  type: string;
  message: string;
  category?: NotificationCategory | string;
  priority?: NotificationPriorityValue;
  title?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

const sanitizeListQuery = (query?: NotificationListQuery) => {
  if (!query) {
    return undefined;
  }

  const page = sanitizeOptionalNumber(query.page, 'page', { integer: true, min: 1 });
  const limit = sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 100 });
  const dateFrom = sanitizeOptionalDate(query.dateFrom, 'dateFrom');
  const dateTo = sanitizeOptionalDate(query.dateTo, 'dateTo');

  return baseApi.sanitizeQueryParams({
    type: sanitizeOptionalString(query.type, 'type', { maxLength: 100 }),
    category: sanitizeOptionalEnum(query.category, 'category', NOTIFICATION_CATEGORY_VALUES),
    priority: sanitizeOptionalEnum(query.priority, 'priority', NOTIFICATION_PRIORITY_VALUES),
    read: sanitizeOptionalBoolean(query.read, 'read'),
    page,
    limit,
    dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
    dateTo: dateTo ? dateTo.toISOString() : undefined
  });
};

const sanitizeNotificationIdParams = (id: string) => {
  return sanitizeObjectId(id, 'id');
};

const sanitizeNotificationIdsPayload = (ids: string[]) => {
  return sanitizeArray(ids, 'notificationIds', (value, index) =>
    sanitizeObjectId(value, `notificationIds[${index}]`)
  );
};

const sanitizeCreatePayload = (payload: NotificationCreateInput) => {
  const sanitizedData = baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId'),
    type: sanitizeString(payload.type, 'type', { maxLength: 100 }),
    message: sanitizeString(payload.message, 'message', { maxLength: 2000 }),
    category: sanitizeOptionalEnum(payload.category, 'category', NOTIFICATION_CATEGORY_VALUES),
    priority: sanitizeOptionalEnum(payload.priority, 'priority', NOTIFICATION_PRIORITY_VALUES),
    title: sanitizeOptionalString(payload.title, 'title', { maxLength: 200 }),
    actionUrl: sanitizeOptionalUrl(payload.actionUrl, 'actionUrl'),
    data: sanitizeOptionalJsonObject<Record<string, unknown>>(payload.data, 'data'),
    templateId: sanitizeOptionalString(payload.templateId, 'templateId', { maxLength: 100 }),
    templateData: sanitizeOptionalJsonObject<Record<string, unknown>>(payload.templateData, 'templateData')
  });

  if (!sanitizedData.type || !sanitizedData.message) {
    throw new Error('Notification type and message are required');
  }

  return sanitizedData;
};

const sanitizeTypeFilter = (type: string) => {
  const match = sanitizeOptionalEnum(type, 'type', NOTIFICATION_EVENT_TYPE_VALUES);
  if (match) {
    return match;
  }
  return sanitizeString(type, 'type', { maxLength: 100 });
};

export const notificationsInboxApi = {
  /**
   * List notifications with optional filters and pagination.
   * GET /api/notifications
   */
  async listNotifications(query?: NotificationListQuery): Promise<NotificationListResponse> {
    const endpoint = `${BASE_PATH}`;
    const params = sanitizeListQuery(query);

    try {
      const response = await api.get<ApiResponse<NotificationListResponse>>(endpoint, { params });
      const result = baseApi.handleResponse(
        response,
        'Failed to fetch notifications',
        500
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  },

  /**
   * Retrieve unread notifications.
   * GET /api/notifications/unread
   */
  async getUnreadNotifications(): Promise<NotificationSummary[]> {
    const endpoint = `${BASE_PATH}/unread`;

    try {
      const response = await api.get<ApiResponse<{ notifications: NotificationSummary[] }>>(endpoint);
      const { notifications } = baseApi.handleResponse(
        response,
        'Failed to fetch unread notifications',
        500
      );
      return notifications;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve a single notification by identifier.
   * GET /api/notifications/:id
   */
  async getNotification(id: string): Promise<NotificationSummary> {
    const sanitizedId = sanitizeNotificationIdParams(id);
    const endpoint = `${BASE_PATH}/${sanitizedId}`;

    try {
      const response = await api.get<ApiResponse<{ notification: NotificationSummary }>>(endpoint);
      const { notification } = baseApi.handleResponse(
        response,
        'Failed to fetch notification',
        404
      );
      return notification;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('GET', endpoint, { id: sanitizedId })
      );
    }
  },

  /**
   * Mark a notification as read.
   * PATCH /api/notifications/:id/read
   */
  async markNotificationAsRead(id: string): Promise<NotificationSummary> {
    const sanitizedId = sanitizeNotificationIdParams(id);
    const endpoint = `${BASE_PATH}/${sanitizedId}/read`;

    try {
      const response = await api.patch<ApiResponse<{ notification: NotificationSummary }>>(endpoint);
      const { notification } = baseApi.handleResponse(
        response,
        'Failed to mark notification as read',
        400
      );
      return notification;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('PATCH', endpoint, { id: sanitizedId })
      );
    }
  },

  /**
   * Mark all notifications as read.
   * POST /api/notifications/mark-all-read
   */
  async markAllAsRead(): Promise<{ modified: number }> {
    const endpoint = `${BASE_PATH}/mark-all-read`;

    try {
      const response = await api.post<ApiResponse<{ modified: number }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to mark all notifications as read',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('POST', endpoint)
      );
    }
  },

  /**
   * Delete a notification by identifier.
   * DELETE /api/notifications/:id
   */
  async deleteNotification(id: string): Promise<{ deleted: boolean }> {
    const sanitizedId = sanitizeNotificationIdParams(id);
    const endpoint = `${BASE_PATH}/${sanitizedId}`;

    try {
      const response = await api.delete<ApiResponse<{ deleted: boolean }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to delete notification',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('DELETE', endpoint, { id: sanitizedId })
      );
    }
  },

  /**
   * Delete multiple notifications.
   * POST /api/notifications/bulk-delete
   */
  async bulkDeleteNotifications(notificationIds: string[]): Promise<{ deleted: number }> {
    const sanitizedIds = sanitizeNotificationIdsPayload(notificationIds);
    const endpoint = `${BASE_PATH}/bulk-delete`;

    try {
      const response = await api.post<ApiResponse<{ deleted: number }>>(endpoint, {
        notificationIds: sanitizedIds
      });
      return baseApi.handleResponse(
        response,
        'Failed to bulk delete notifications',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('POST', endpoint, { count: sanitizedIds.length })
      );
    }
  },

  /**
   * Retrieve notifications by type.
   * GET /api/notifications/type/:type
   */
  async getNotificationsByType(type: string, limit?: number): Promise<NotificationSummary[]> {
    const sanitizedType = sanitizeTypeFilter(type);
    const endpoint = `${BASE_PATH}/type/${sanitizedType}`;
    const params = limit !== undefined
      ? baseApi.sanitizeQueryParams({
        limit: sanitizeOptionalNumber(limit, 'limit', { integer: true, min: 1, max: 100 })
      })
      : undefined;

    try {
      const response = await api.get<ApiResponse<{ notifications: NotificationSummary[] }>>(endpoint, {
        params
      });
      const { notifications } = baseApi.handleResponse(
        response,
        'Failed to fetch notifications by type',
        500
      );
      return notifications;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('GET', endpoint, { hasLimit: Boolean(params?.limit) })
      );
    }
  },

  /**
   * Create a notification for a recipient.
   * POST /api/notifications
   */
  async createNotification(payload: NotificationCreateInput): Promise<NotificationSummary> {
    const sanitizedPayload = sanitizeCreatePayload(payload);
    const endpoint = `${BASE_PATH}`;

    try {
      const response = await api.post<ApiResponse<{ notification: NotificationSummary }>>(endpoint, sanitizedPayload);
      const { notification } = baseApi.handleResponse(
        response,
        'Failed to create notification',
        400
      );
      return notification;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsInboxLogContext('POST', endpoint, {
          type: sanitizedPayload.type,
          hasTemplate: Boolean(sanitizedPayload.templateId)
        })
      );
    }
  }
};

export default notificationsInboxApi;
