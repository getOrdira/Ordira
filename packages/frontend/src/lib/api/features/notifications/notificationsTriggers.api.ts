// src/lib/api/features/notifications/notificationsTriggers.api.ts
// Notifications triggers API aligned with backend routes/features/notifications/notificationsTriggers.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NotificationEvent,
  NotificationRecipient,
  NotificationEventType,
  NotificationCategory,
  NotificationPriority
} from '@/lib/types/features/notifications';
import { NotificationEventType as NotificationEventTypeEnum } from '@backend/services/notifications/types/notificationEventType';
import { NotificationCategory as NotificationCategoryEnum } from '@backend/services/notifications/types/notificationCategory';
import { NotificationPriority as NotificationPriorityEnum } from '@backend/services/notifications/types/notificationPriority';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalObjectId,
  sanitizeOptionalUrl,
  sanitizeOptionalString,
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalJsonObject,
  sanitizeEnum
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalContactName, sanitizeOptionalEmail } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/notifications/triggers';

type HttpMethod = 'POST';

const createNotificationsTriggersLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'triggers',
  method,
  endpoint,
  ...context
});

const NOTIFICATION_EVENT_TYPE_VALUES = Object.values(NotificationEventTypeEnum) as readonly NotificationEventType[];
const NOTIFICATION_CATEGORY_VALUES = Object.values(NotificationCategoryEnum) as readonly NotificationCategory[];
const NOTIFICATION_PRIORITY_VALUES = Object.values(NotificationPriorityEnum) as readonly NotificationPriority[];

export interface NotificationTriggerInput {
  type: NotificationEventType;
  recipient: NotificationRecipient;
  payload?: Record<string, unknown>;
  metadata?: NotificationEvent['metadata'];
  dryRun?: boolean;
}

export interface NotificationTriggerResponse {
  processed: boolean;
  dryRun?: boolean;
  eventType: string;
}

const sanitizeTriggerRecipient = (recipient: NotificationRecipient) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(recipient.businessId, 'recipient.businessId'),
    manufacturerId: sanitizeOptionalObjectId(recipient.manufacturerId, 'recipient.manufacturerId'),
    userId: sanitizeOptionalObjectId(recipient.userId, 'recipient.userId'),
    email: sanitizeOptionalEmail(recipient.email, 'recipient.email'),
    webhookUrl: sanitizeOptionalUrl(recipient.webhookUrl, 'recipient.webhookUrl'),
    name: sanitizeOptionalContactName(recipient.name, 'recipient.name')
  });
};

const sanitizeTriggerMetadata = (metadata?: NotificationEvent['metadata']) => {
  if (!metadata) {
    return undefined;
  }

  const category = metadata.category
    ? sanitizeEnum(metadata.category, 'metadata.category', NOTIFICATION_CATEGORY_VALUES)
    : undefined;

  if (!category) {
    throw new Error('Notification metadata category is required when metadata is provided');
  }

  const channels = metadata.channels
    ? baseApi.sanitizeRequestData({
        email: sanitizeOptionalBoolean(metadata.channels.email, 'metadata.channels.email'),
        webhook: sanitizeOptionalBoolean(metadata.channels.webhook, 'metadata.channels.webhook'),
        inApp: sanitizeOptionalBoolean(metadata.channels.inApp, 'metadata.channels.inApp'),
        slack: sanitizeOptionalBoolean((metadata.channels as Record<string, unknown>).slack, 'metadata.channels.slack')
      })
    : undefined;

  const sanitized = baseApi.sanitizeRequestData({
    category,
    priority: sanitizeOptionalEnum(metadata.priority, 'metadata.priority', NOTIFICATION_PRIORITY_VALUES),
    title: sanitizeOptionalString(metadata.title, 'metadata.title', { maxLength: 200 }),
    message: sanitizeOptionalString(metadata.message, 'metadata.message', { maxLength: 2000 }),
    actionUrl: sanitizeOptionalUrl(metadata.actionUrl, 'metadata.actionUrl'),
    templateKey: sanitizeOptionalString(metadata.templateKey, 'metadata.templateKey', { maxLength: 200 }),
    channels
  }) as NotificationEvent['metadata'];

  return sanitized;
};

const sanitizeTriggerEvent = (event: NotificationTriggerInput): NotificationEvent => {
  const type = sanitizeEnum(event.type, 'type', NOTIFICATION_EVENT_TYPE_VALUES);

  const payload = sanitizeOptionalJsonObject<Record<string, unknown>>(event.payload ?? {}, 'payload') ?? {};

  return baseApi.sanitizeRequestData({
    type,
    recipient: sanitizeTriggerRecipient(event.recipient),
    payload,
    metadata: sanitizeTriggerMetadata(event.metadata)
  });
};

export const notificationsTriggersApi = {
  /**
   * Handle a notification event trigger.
   * POST /api/notifications/triggers/event
   */
  async handleEvent(event: NotificationTriggerInput): Promise<NotificationTriggerResponse> {
    const sanitizedEvent = sanitizeTriggerEvent(event);
    const endpoint = `${BASE_PATH}/event`;
    const dryRun = sanitizeOptionalBoolean(event.dryRun, 'dryRun');

    try {
      const response = await api.post<ApiResponse<NotificationTriggerResponse>>(endpoint, {
        ...sanitizedEvent,
        dryRun
      });
      return baseApi.handleResponse(
        response,
        'Failed to process notification trigger',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsTriggersLogContext('POST', endpoint, {
          eventType: sanitizedEvent.type,
          dryRun
        })
      );
    }
  }
};

export default notificationsTriggersApi;
