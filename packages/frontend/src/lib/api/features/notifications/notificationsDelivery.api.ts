// src/lib/api/features/notifications/notificationsDelivery.api.ts
// Notifications delivery API aligned with backend routes/features/notifications/notificationsDelivery.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NotificationEvent,
  NotificationRecipient,
  NotificationEventType,
  NotificationPriority,
  NotificationCategory
} from '@/lib/types/features/notifications';
import { NotificationEventType as NotificationEventTypeEnum } from '@backend/services/notifications/types/notificationEventType';
import { NotificationCategory as NotificationCategoryEnum } from '@backend/services/notifications/types/notificationCategory';
import { NotificationPriority as NotificationPriorityEnum } from '@backend/services/notifications/types/notificationPriority';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeOptionalObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalEnum,
  sanitizeOptionalJsonObject,
  sanitizeOptionalArray,
  sanitizeOptionalUrl,
  sanitizeOptionalDate,
  sanitizeEnum
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalEmail, sanitizeOptionalContactName } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/notifications/delivery';

type HttpMethod = 'POST';

const createNotificationsDeliveryLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'delivery',
  method,
  endpoint,
  ...context
});

const NOTIFICATION_EVENT_TYPE_VALUES = Object.values(NotificationEventTypeEnum) as readonly NotificationEventType[];
const NOTIFICATION_CATEGORY_VALUES = Object.values(NotificationCategoryEnum) as readonly NotificationCategory[];
const NOTIFICATION_PRIORITY_VALUES = Object.values(NotificationPriorityEnum) as readonly NotificationPriority[];
const DELIVERY_CHANNELS = ['email', 'sms', 'push', 'inApp', 'webhook'] as const;
const DELIVERY_PRIORITY_VALUES = ['low', 'normal', 'medium', 'high', 'urgent'] as const;

export type NotificationDeliveryChannel = typeof DELIVERY_CHANNELS[number];

export interface NotificationEventInput {
  type: NotificationEventType;
  recipient: NotificationRecipient;
  payload?: Record<string, unknown>;
  metadata?: NotificationEvent['metadata'];
}

export interface NotificationDeliveryOptionsInput {
  channels?: NotificationDeliveryChannel[];
  priority?: (typeof DELIVERY_PRIORITY_VALUES)[number];
  delayUntil?: Date | string;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface DeliverNotificationInput {
  event: NotificationEventInput;
  options?: NotificationDeliveryOptionsInput;
}

export interface NotificationDeliveryResult {
  delivered: boolean;
}

export interface NotificationChannelTestResults {
  email: unknown;
  slack: unknown;
}

const sanitizeNotificationRecipient = (recipient: NotificationRecipient) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(recipient.businessId, 'event.recipient.businessId'),
    manufacturerId: sanitizeOptionalObjectId(recipient.manufacturerId, 'event.recipient.manufacturerId'),
    userId: sanitizeOptionalObjectId(recipient.userId, 'event.recipient.userId'),
    email: sanitizeOptionalEmail(recipient.email, 'event.recipient.email'),
    webhookUrl: sanitizeOptionalUrl(recipient.webhookUrl, 'event.recipient.webhookUrl'),
    name: sanitizeOptionalContactName(recipient.name, 'event.recipient.name')
  });
};

const sanitizeNotificationMetadata = (metadata?: NotificationEvent['metadata']) => {
  if (!metadata) {
    return undefined;
  }

  const category = metadata.category
    ? sanitizeEnum(metadata.category, 'event.metadata.category', NOTIFICATION_CATEGORY_VALUES)
    : undefined;

  if (!category) {
    throw new Error('Notification metadata category is required when metadata is provided');
  }

  const channels = metadata.channels
    ? baseApi.sanitizeRequestData({
        email: sanitizeOptionalBoolean(metadata.channels.email, 'event.metadata.channels.email'),
        webhook: sanitizeOptionalBoolean(metadata.channels.webhook, 'event.metadata.channels.webhook'),
        inApp: sanitizeOptionalBoolean(metadata.channels.inApp, 'event.metadata.channels.inApp'),
        slack: sanitizeOptionalBoolean((metadata.channels as Record<string, unknown>).slack, 'event.metadata.channels.slack')
      })
    : undefined;

  const sanitized = baseApi.sanitizeRequestData({
    category,
    priority: sanitizeOptionalEnum(
      metadata.priority,
      'event.metadata.priority',
      NOTIFICATION_PRIORITY_VALUES
    ),
    title: sanitizeOptionalString(metadata.title, 'event.metadata.title', { maxLength: 200 }),
    message: sanitizeOptionalString(metadata.message, 'event.metadata.message', { maxLength: 2000 }),
    actionUrl: sanitizeOptionalUrl(metadata.actionUrl, 'event.metadata.actionUrl'),
    templateKey: sanitizeOptionalString(metadata.templateKey, 'event.metadata.templateKey', { maxLength: 200 }),
    channels
  }) as NotificationEvent['metadata'];

  return sanitized;
};

const sanitizeNotificationEvent = (event: NotificationEventInput): NotificationEvent => {
  const type = sanitizeEnum(event.type, 'event.type', NOTIFICATION_EVENT_TYPE_VALUES);

  const payload = sanitizeOptionalJsonObject<Record<string, unknown>>(
    event.payload ?? {},
    'event.payload'
  ) ?? {};

  return baseApi.sanitizeRequestData({
    type,
    recipient: sanitizeNotificationRecipient(event.recipient),
    payload,
    metadata: sanitizeNotificationMetadata(event.metadata)
  });
};

const sanitizeDeliveryOptions = (options?: NotificationDeliveryOptionsInput) => {
  if (!options) {
    return undefined;
  }

  const channels = sanitizeOptionalArray(
    options.channels,
    'options.channels',
    (value, index) =>
      sanitizeEnum(
        value,
        `options.channels[${index}]`,
        DELIVERY_CHANNELS
      ),
    { minLength: 1, maxLength: DELIVERY_CHANNELS.length }
  );

  const delayUntil = sanitizeOptionalDate(options.delayUntil, 'options.delayUntil');

  return baseApi.sanitizeRequestData({
    channels,
    priority: sanitizeOptionalEnum(options.priority, 'options.priority', DELIVERY_PRIORITY_VALUES),
    delayUntil: delayUntil ? delayUntil.toISOString() : undefined,
    retryOnFailure: sanitizeOptionalBoolean(options.retryOnFailure, 'options.retryOnFailure'),
    maxRetries: sanitizeOptionalNumber(options.maxRetries, 'options.maxRetries', {
      integer: true,
      min: 0,
      max: 10
    })
  });
};

export const notificationsDeliveryApi = {
  /**
   * Deliver a notification event through the delivery service.
   * POST /api/notifications/delivery/deliver
   */
  async deliverNotification(payload: DeliverNotificationInput): Promise<NotificationDeliveryResult> {
    const endpoint = `${BASE_PATH}/deliver`;
    const sanitizedPayload = baseApi.sanitizeRequestData({
      event: sanitizeNotificationEvent(payload.event),
      options: sanitizeDeliveryOptions(payload.options)
    });

    try {
      const response = await api.post<ApiResponse<NotificationDeliveryResult>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to deliver notification',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsDeliveryLogContext('POST', endpoint, {
          type: sanitizedPayload.event?.type,
          hasOptions: Boolean(sanitizedPayload.options)
        })
      );
    }
  },

  /**
   * Test notification channel configurations (email, slack, etc.).
   * POST /api/notifications/delivery/test-channels
   */
  async testChannelConfigurations(): Promise<NotificationChannelTestResults> {
    const endpoint = `${BASE_PATH}/test-channels`;

    try {
      const response = await api.post<ApiResponse<{ results: NotificationChannelTestResults }>>(endpoint);
      const { results } = baseApi.handleResponse(
        response,
        'Failed to test notification channel configurations',
        500
      );
      return results;
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsDeliveryLogContext('POST', endpoint)
      );
    }
  }
};

export default notificationsDeliveryApi;
