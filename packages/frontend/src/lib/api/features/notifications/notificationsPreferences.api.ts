// src/lib/api/features/notifications/notificationsPreferences.api.ts
// Notifications preferences API aligned with backend routes/features/notifications/notificationsPreferences.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  NotificationPreferences,
  ChannelPreferences,
  CategoryPreferences
} from '@/lib/types/features/notifications';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalString,
  sanitizeOptionalArray,
  sanitizeOptionalUrl,
  sanitizeEnum
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalEmail, sanitizeOptionalPhoneNumber } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/notifications/preferences';

type HttpMethod = 'GET' | 'PUT';

const createNotificationsPreferencesLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'preferences',
  method,
  endpoint,
  ...context
});

const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'inApp', 'webhook'] as const;
const NOTIFICATION_FREQUENCIES = ['immediate', 'daily', 'weekly', 'never'] as const;

export interface NotificationEffectivePreferences {
  channel: Required<ChannelPreferences>;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  timezone?: string;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
  effective: NotificationEffectivePreferences;
}

export type NotificationPreferencesUpdateInput = Partial<NotificationPreferences>;

interface BaseChannelToggle {
  enabled?: boolean;
}

interface EmailChannelToggle extends BaseChannelToggle {
  address?: string;
}

interface SmsChannelToggle extends BaseChannelToggle {
  number?: string;
}

interface PushChannelToggle extends BaseChannelToggle {
  token?: string;
}

interface WebhookChannelToggle extends BaseChannelToggle {
  url?: string;
}

interface CategoryPreferenceToggle extends BaseChannelToggle {
  channels?: unknown;
}

const normalizeChannelToggle = <T extends BaseChannelToggle>(
  value: unknown
): T | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return { enabled: value } as T;
  }

  if (typeof value === 'object') {
    return value as T;
  }

  return undefined;
};

const normalizeCategoryPreferenceToggle = (
  value: unknown
): CategoryPreferenceToggle | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return { enabled: value };
  }

  if (typeof value === 'object') {
    return value as CategoryPreferenceToggle;
  }

  return undefined;
};

const sanitizeChannelPreferences = (channel?: ChannelPreferences) => {
  if (!channel) {
    return undefined;
  }

  const channelRecord = channel as unknown as Record<string, unknown>;

  const emailInput = normalizeChannelToggle<EmailChannelToggle>(channelRecord.email);
  const email = emailInput
    ? baseApi.sanitizeRequestData({
        enabled: sanitizeOptionalBoolean(emailInput.enabled, 'channel.email.enabled'),
        address: sanitizeOptionalEmail(emailInput.address, 'channel.email.address')
      })
    : undefined;

  const smsInput = normalizeChannelToggle<SmsChannelToggle>(channelRecord.sms);
  const sms = smsInput
    ? baseApi.sanitizeRequestData({
        enabled: sanitizeOptionalBoolean(smsInput.enabled, 'channel.sms.enabled'),
        number: sanitizeOptionalPhoneNumber(smsInput.number, 'channel.sms.number')
      })
    : undefined;

  const pushInput = normalizeChannelToggle<PushChannelToggle>(channelRecord.push);
  const push = pushInput
    ? baseApi.sanitizeRequestData({
        enabled: sanitizeOptionalBoolean(pushInput.enabled, 'channel.push.enabled'),
        token: sanitizeOptionalString(pushInput.token, 'channel.push.token', { maxLength: 500 })
      })
    : undefined;

  const inAppInput = normalizeChannelToggle<BaseChannelToggle>(channelRecord.inApp);
  const inApp = inAppInput
    ? baseApi.sanitizeRequestData({
        enabled: sanitizeOptionalBoolean(inAppInput.enabled, 'channel.inApp.enabled')
      })
    : undefined;

  const webhookInput = normalizeChannelToggle<WebhookChannelToggle>(channelRecord.webhook);
  const webhook = webhookInput
    ? baseApi.sanitizeRequestData({
        enabled: sanitizeOptionalBoolean(webhookInput.enabled, 'channel.webhook.enabled'),
        url: sanitizeOptionalUrl(webhookInput.url, 'channel.webhook.url', { allowedProtocols: ['http:', 'https:'] })
      })
    : undefined;

  return baseApi.sanitizeRequestData({
    email,
    sms,
    push,
    inApp,
    webhook
  });
};

const sanitizeCategoryChannels = (channels: unknown, field: string) => {
  return sanitizeOptionalArray(
    channels,
    field,
    (value, index) => sanitizeEnum(value, `${field}[${index}]`, NOTIFICATION_CHANNELS),
    { minLength: 1, maxLength: NOTIFICATION_CHANNELS.length }
  );
};

const sanitizeCategoryPreference = (categoryInput: unknown, key: string) => {
  const category = normalizeCategoryPreferenceToggle(categoryInput);
  if (!category) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    enabled: sanitizeOptionalBoolean(category.enabled, `categories.${key}.enabled`),
    channels: sanitizeCategoryChannels(category.channels, `categories.${key}.channels`)
  });
};

const sanitizeCategoryPreferences = (categories?: CategoryPreferences) => {
  if (!categories) {
    return undefined;
  }

  const categoriesRecord = categories as unknown as Record<string, unknown>;

  return baseApi.sanitizeRequestData({
    billing: sanitizeCategoryPreference(categoriesRecord.billing, 'billing'),
    account: sanitizeCategoryPreference(categoriesRecord.account, 'account'),
    security: sanitizeCategoryPreference(categoriesRecord.security, 'security'),
    marketing: sanitizeCategoryPreference(categoriesRecord.marketing, 'marketing'),
    updates: sanitizeCategoryPreference(categoriesRecord.updates, 'updates')
  });
};

const sanitizePreferencesUpdatePayload = (payload: NotificationPreferencesUpdateInput) => {
  return baseApi.sanitizeRequestData({
    channel: sanitizeChannelPreferences(payload.channel),
    categories: sanitizeCategoryPreferences(payload.categories),
    frequency: sanitizeOptionalEnum(payload.frequency, 'frequency', NOTIFICATION_FREQUENCIES),
    timezone: sanitizeOptionalString(payload.timezone, 'timezone', { maxLength: 100 })
  });
};

export const notificationsPreferencesApi = {
  /**
   * Retrieve notification preferences and effective settings.
   * GET /api/notifications/preferences
   */
  async getPreferences(): Promise<NotificationPreferencesResponse> {
    const endpoint = `${BASE_PATH}`;

    try {
      const response = await api.get<ApiResponse<NotificationPreferencesResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch notification preferences',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsPreferencesLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Update notification preferences.
   * PUT /api/notifications/preferences
   */
  async updatePreferences(
    payload: NotificationPreferencesUpdateInput
  ): Promise<NotificationPreferencesResponse> {
    const sanitizedPayload = sanitizePreferencesUpdatePayload(payload);
    const endpoint = `${BASE_PATH}`;

    try {
      const response = await api.put<ApiResponse<NotificationPreferencesResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to update notification preferences',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createNotificationsPreferencesLogContext('PUT', endpoint, {
          hasChannelUpdates: Boolean(sanitizedPayload.channel),
          hasCategoryUpdates: Boolean(sanitizedPayload.categories)
        })
      );
    }
  }
};

export default notificationsPreferencesApi;
