
import { deliveryService } from './delivery.service';
import { templateService } from './template.service';
import { notificationDataService } from '../core/notificationData.service';
import {
  NotificationEvent,
  NotificationEventType,
  NotificationCategory,
  NotificationPriority,
} from '../types';

interface NotificationEventConfig {
  templateKey?: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  storeInApp?: boolean;
  channels?: { email?: boolean; webhook?: boolean; inApp?: boolean };
  defaultMessage: (payload: Record<string, unknown>) => string;
  defaultActionUrl?: (payload: Record<string, unknown>) => string | undefined;
}

const EVENT_CONFIG: Record<NotificationEventType, NotificationEventConfig> = {
  [NotificationEventType.ConnectionRequested]: {
    templateKey: 'connection.requested',
    category: NotificationCategory.Connection,
    priority: NotificationPriority.Medium,
    defaultMessage: payload => `${payload.requesterName ?? 'A partner'} requested a connection`,
  },
  [NotificationEventType.ConnectionAccepted]: {
    templateKey: 'connection.accepted',
    category: NotificationCategory.Connection,
    defaultMessage: payload => `${payload.partnerName ?? 'A partner'} accepted your connection`,
  },
  [NotificationEventType.CertificateMinted]: {
    templateKey: 'certificate.minted',
    category: NotificationCategory.Certificate,
    defaultMessage: payload => `Certificate minted for ${payload.productName ?? 'a product'}`,
  },
  [NotificationEventType.CertificateTransferFailed]: {
    templateKey: 'certificate.transfer_failed',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: payload => `Certificate transfer failed${payload.tokenId ? ` (${payload.tokenId})` : ''}`,
  },
  [NotificationEventType.SubscriptionRenewalUpcoming]: {
    templateKey: 'billing.renewal-upcoming',
    category: NotificationCategory.Billing,
    defaultMessage: payload => `Subscription renewal upcoming for ${payload.plan ?? 'your plan'}`,
  },
  [NotificationEventType.SubscriptionRenewed]: {
    templateKey: 'billing.renewal-success',
    category: NotificationCategory.Billing,
    defaultMessage: payload => `Subscription renewed for ${payload.plan ?? 'your plan'}`,
  },
  [NotificationEventType.SubscriptionPlanChanged]: {
    templateKey: 'billing.plan-change',
    category: NotificationCategory.Billing,
    defaultMessage: payload => `Plan changed to ${payload.newPlan ?? 'new plan'}`,
  },
  [NotificationEventType.SubscriptionCancelled]: {
    templateKey: 'billing.subscription-cancelled',
    category: NotificationCategory.Billing,
    defaultMessage: payload => `${payload.plan ?? 'Your plan'} was cancelled`,
  },
  [NotificationEventType.PaymentFailed]: {
    templateKey: 'billing.payment-failed',
    category: NotificationCategory.Billing,
    priority: NotificationPriority.High,
    defaultMessage: payload => `Payment failed for ${payload.invoiceId ?? 'an invoice'}`,
  },
  [NotificationEventType.AccountSecurityAlert]: {
    templateKey: 'account.security_alert',
    category: NotificationCategory.Security,
    priority: NotificationPriority.Urgent,
    defaultMessage: () => 'Security alert on your account',
  },
  [NotificationEventType.AccountProfileUpdated]: {
    templateKey: 'account.profile_updated',
    category: NotificationCategory.Account,
    defaultMessage: () => 'Your profile was updated',
  },
  [NotificationEventType.AccountVerificationSubmitted]: {
    templateKey: 'account.verification_submitted',
    category: NotificationCategory.Security,
    defaultMessage: () => 'Verification submitted successfully',
  },
  [NotificationEventType.AccountDeletionConfirmed]: {
    templateKey: 'account.deletion_confirmed',
    category: NotificationCategory.Account,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Account deletion confirmed',
  },
};

export class TriggersService {
  async handle(event: NotificationEvent): Promise<void> {
    const config = EVENT_CONFIG[event.type];
    const templateKey = event.metadata?.templateKey ?? config?.templateKey;
    const rendered = templateKey ? templateService.render(templateKey, { payload: event.payload }) : null;

    const category = event.metadata?.category ?? rendered?.metadata?.category ?? config?.category ?? NotificationCategory.System;
    const priority = event.metadata?.priority ?? rendered?.metadata?.priority ?? config?.priority ?? NotificationPriority.Medium;

    const baseChannels = { ...(rendered?.metadata?.channels ?? {}), ...(config?.channels ?? {}), ...(event.metadata?.channels ?? {}) };
    const wantsInApp = baseChannels.inApp ?? true;
    const shouldStoreInApp = wantsInApp && (config?.storeInApp ?? true);

    if (shouldStoreInApp) {
      const message = event.metadata?.message ?? rendered?.inApp?.message ?? config?.defaultMessage(event.payload);
      const actionUrl = event.metadata?.actionUrl ?? rendered?.inApp?.actionUrl ?? config?.defaultActionUrl?.(event.payload);

      await notificationDataService.createNotification({
        businessId: event.recipient.businessId,
        manufacturerId: event.recipient.manufacturerId,
        type: event.type,
        message,
        category,
        priority,
        title: rendered?.metadata?.title ?? event.metadata?.title,
        actionUrl,
        data: event.payload,
        templateId: rendered?.metadata?.templateKey ?? templateKey,
        templateData: event.payload,
      });
    }


    await deliveryService.deliver({
      ...event,
      metadata: {
        category,
        priority,
        title: rendered?.metadata?.title ?? event.metadata?.title,
        actionUrl: event.metadata?.actionUrl ?? rendered?.metadata?.actionUrl,
        templateKey,
        channels: shouldStoreInApp ? { ...baseChannels, inApp: false } : baseChannels,
      },
    });
  }
}

export const triggersService = new TriggersService();
