// src/lib/api/features/notifications/notificationsOutbound.api.ts
// Notifications outbound API aligned with backend routes/features/notifications/notificationsOutbound.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalObjectId,
  sanitizeString,
  sanitizeNumber,
  sanitizeObjectId
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEmail } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/notifications/outbound';

type HttpMethod = 'POST';

const createNotificationsOutboundLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'notifications',
  module: 'outbound',
  method,
  endpoint,
  ...context
});

export interface NotificationPlanChangeInput {
  businessId?: string;
  email: string;
  oldPlan: string;
  newPlan: string;
}

export interface NotificationCancellationInput {
  businessId?: string;
  email: string;
  plan: string;
}

export interface NotificationRenewalInput {
  businessId?: string;
  email: string;
  plan: string;
  amount: number;
}

export interface NotificationPaymentFailedInput {
  businessId?: string;
  email: string;
  invoiceId: string;
}

export interface NotificationSubscriptionWelcomeInput {
  businessId: string;
  tier: string;
}

export interface NotificationAccountDeletionInput {
  email: string;
  reason?: string;
}

export interface NotificationOutboundResponse {
  sent: boolean;
}

const sanitizePlanChangePayload = (payload: NotificationPlanChangeInput) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    email: sanitizeEmail(payload.email, 'email'),
    oldPlan: sanitizeString(payload.oldPlan, 'oldPlan', { maxLength: 100 }),
    newPlan: sanitizeString(payload.newPlan, 'newPlan', { maxLength: 100 })
  });
};

const sanitizeCancellationPayload = (payload: NotificationCancellationInput) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    email: sanitizeEmail(payload.email, 'email'),
    plan: sanitizeString(payload.plan, 'plan', { maxLength: 100 })
  });
};

const sanitizeRenewalPayload = (payload: NotificationRenewalInput) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    email: sanitizeEmail(payload.email, 'email'),
    plan: sanitizeString(payload.plan, 'plan', { maxLength: 100 }),
    amount: sanitizeNumber(payload.amount, 'amount', { min: 0 })
  });
};

const sanitizePaymentFailedPayload = (payload: NotificationPaymentFailedInput) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    email: sanitizeEmail(payload.email, 'email'),
    invoiceId: sanitizeString(payload.invoiceId, 'invoiceId', { maxLength: 200 })
  });
};

const sanitizeSubscriptionWelcomePayload = (payload: NotificationSubscriptionWelcomeInput) => {
  return baseApi.sanitizeRequestData({
    businessId: sanitizeObjectId(payload.businessId, 'businessId'),
    tier: sanitizeString(payload.tier, 'tier', { maxLength: 100 })
  });
};

const sanitizeAccountDeletionPayload = (payload: NotificationAccountDeletionInput) => {
  return baseApi.sanitizeRequestData({
    email: sanitizeEmail(payload.email, 'email'),
    reason: payload.reason
      ? sanitizeString(payload.reason, 'reason', { maxLength: 500 })
      : undefined
  });
};

const postOutboundRequest = async <TPayload>(
  endpoint: string,
  payload: TPayload,
  logContext: Record<string, unknown>
): Promise<NotificationOutboundResponse> => {
  try {
    const response = await api.post<ApiResponse<NotificationOutboundResponse>>(endpoint, payload);
    return baseApi.handleResponse(
      response,
      'Failed to send outbound notification',
      400
    );
  } catch (error) {
    throw handleApiError(
      error,
      createNotificationsOutboundLogContext('POST', endpoint, logContext)
    );
  }
};

export const notificationsOutboundApi = {
  /**
   * Send plan change notification.
   * POST /api/notifications/outbound/plan-change
   */
  async sendPlanChange(payload: NotificationPlanChangeInput): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizePlanChangePayload(payload);
    return postOutboundRequest(`${BASE_PATH}/plan-change`, sanitized, {
      businessId: sanitized.businessId,
      oldPlan: sanitized.oldPlan,
      newPlan: sanitized.newPlan
    });
  },

  /**
   * Send subscription cancellation notification.
   * POST /api/notifications/outbound/cancellation
   */
  async sendCancellation(payload: NotificationCancellationInput): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizeCancellationPayload(payload);
    return postOutboundRequest(`${BASE_PATH}/cancellation`, sanitized, {
      businessId: sanitized.businessId,
      plan: sanitized.plan
    });
  },

  /**
   * Send subscription renewal notification.
   * POST /api/notifications/outbound/renewal
   */
  async sendRenewal(payload: NotificationRenewalInput): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizeRenewalPayload(payload);
    return postOutboundRequest(`${BASE_PATH}/renewal`, sanitized, {
      businessId: sanitized.businessId,
      plan: sanitized.plan,
      amount: sanitized.amount
    });
  },

  /**
   * Send payment failed notification.
   * POST /api/notifications/outbound/payment-failed
   */
  async sendPaymentFailed(payload: NotificationPaymentFailedInput): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizePaymentFailedPayload(payload);
    return postOutboundRequest(`${BASE_PATH}/payment-failed`, sanitized, {
      businessId: sanitized.businessId,
      invoiceId: sanitized.invoiceId
    });
  },

  /**
   * Send subscription welcome notification.
   * POST /api/notifications/outbound/subscription-welcome
   */
  async sendSubscriptionWelcome(
    payload: NotificationSubscriptionWelcomeInput
  ): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizeSubscriptionWelcomePayload(payload);
    return postOutboundRequest(`${BASE_PATH}/subscription-welcome`, sanitized, {
      businessId: sanitized.businessId,
      tier: sanitized.tier
    });
  },

  /**
   * Send account deletion confirmation.
   * POST /api/notifications/outbound/account-deletion
   */
  async sendAccountDeletionConfirmation(
    payload: NotificationAccountDeletionInput
  ): Promise<NotificationOutboundResponse> {
    const sanitized = sanitizeAccountDeletionPayload(payload);
    return postOutboundRequest(`${BASE_PATH}/account-deletion`, sanitized, {
      email: sanitized.email
    });
  }
};

export default notificationsOutboundApi;
