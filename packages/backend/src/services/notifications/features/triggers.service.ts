
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
  channels?: { email?: boolean; webhook?: boolean; inApp?: boolean; slack?: boolean };
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
  [NotificationEventType.ConnectionDeclined]: {
    templateKey: 'connection.declined',
    category: NotificationCategory.Connection,
    defaultMessage: payload => `${payload.partnerName ?? 'A partner'} declined your connection`,
  },
  [NotificationEventType.CertificateMinted]: {
    templateKey: 'certificate.minted',
    category: NotificationCategory.Certificate,
    defaultMessage: payload => `Certificate minted for ${payload.productName ?? 'a product'}`,
  },
  [NotificationEventType.CertificateMintFailed]: {
    templateKey: 'certificate.mint_failed',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Certificate minting failed',
  },
  [NotificationEventType.CertificateBatchCompleted]: {
    templateKey: 'certificate.batch_completed',
    category: NotificationCategory.Certificate,
    defaultMessage: payload => `Batch completed: ${payload.batchSize ?? 'multiple'} certificates`,
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
  [NotificationEventType.SubscriptionWelcome]: {
    templateKey: 'subscription.welcome',
    category: NotificationCategory.Billing,
    defaultMessage: () => 'Welcome to your new subscription!',
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
  // Auth events
  [NotificationEventType.AuthEmailVerificationCode]: {
    templateKey: 'auth.email_verification_code',
    category: NotificationCategory.Auth,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: false, webhook: false, slack: false },
    defaultMessage: () => 'Email verification code sent',
  },
  [NotificationEventType.AuthPasswordResetLink]: {
    templateKey: 'auth.password_reset_link',
    category: NotificationCategory.Auth,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: false, webhook: false, slack: false },
    defaultMessage: () => 'Password reset link sent',
  },
  [NotificationEventType.AuthWelcomeEmail]: {
    templateKey: 'auth.welcome_email',
    category: NotificationCategory.Auth,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: false },
    defaultMessage: () => 'Welcome to the platform!',
  },
  // Wallet events
  [NotificationEventType.WalletConnected]: {
    templateKey: 'wallet.connected',
    category: NotificationCategory.Wallet,
    priority: NotificationPriority.Medium,
    channels: { email: false, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Wallet connected successfully',
  },
  [NotificationEventType.WalletChanged]: {
    templateKey: 'wallet.changed',
    category: NotificationCategory.Wallet,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Wallet address changed',
  },
  [NotificationEventType.WalletVerificationPending]: {
    templateKey: 'wallet.verification_pending',
    category: NotificationCategory.Wallet,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: false },
    defaultMessage: () => 'Wallet verification pending',
  },
  [NotificationEventType.WalletVerificationFailed]: {
    templateKey: 'wallet.verification_failed',
    category: NotificationCategory.Wallet,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Wallet verification failed',
  },
  // Certificate events
  [NotificationEventType.CertificateTransferred]: {
    templateKey: 'certificate.transferred',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: false },
    defaultMessage: payload => `Certificate ${payload.tokenId ?? 'transferred'} successfully`,
  },
  [NotificationEventType.CertificateTransferRetry]: {
    templateKey: 'certificate.transfer_retry',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: payload => `Certificate transfer retry ${payload.attempt ? `(attempt ${payload.attempt})` : ''}`,
  },
  [NotificationEventType.CertificateTransferPending]: {
    templateKey: 'certificate.transfer_pending',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.Medium,
    defaultMessage: () => 'Certificate transfer pending',
  },
  [NotificationEventType.CertificateRevoked]: {
    templateKey: 'certificate.revoked',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Certificate revoked',
  },
  [NotificationEventType.CertificateRevocationFailed]: {
    templateKey: 'certificate.revocation_failed',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Certificate revocation failed',
  },
  [NotificationEventType.CertificateDelivered]: {
    templateKey: 'certificate.delivered',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.Medium,
    defaultMessage: () => 'Certificate delivered',
  },
  [NotificationEventType.CertificateDeliveryFailed]: {
    templateKey: 'certificate.delivery_failed',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Certificate delivery failed',
  },
  [NotificationEventType.CertificateExpiringSoon]: {
    templateKey: 'certificate.expiring_soon',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.Medium,
    defaultMessage: payload => `Certificate expiring soon: ${payload.daysLeft ?? 'few days'} remaining`,
  },
  [NotificationEventType.CertificateExpired]: {
    templateKey: 'certificate.expired',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.High,
    defaultMessage: () => 'Certificate expired',
  },
  [NotificationEventType.CertificateVerified]: {
    templateKey: 'certificate.verified',
    category: NotificationCategory.Certificate,
    priority: NotificationPriority.Medium,
    defaultMessage: () => 'Certificate verified',
  },
  // Voting events
  [NotificationEventType.VoteReceived]: {
    templateKey: 'vote.received',
    category: NotificationCategory.Vote,
    priority: NotificationPriority.Medium,
    channels: { email: false, inApp: true, webhook: false, slack: true },
    defaultMessage: payload => `Vote received from ${payload.voterName ?? 'a voter'}`,
  },
  [NotificationEventType.ProposalCreated]: {
    templateKey: 'proposal.created',
    category: NotificationCategory.Vote,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: payload => `New proposal: ${payload.proposalTitle ?? 'Untitled'}`,
  },
  [NotificationEventType.VotingContractDeployed]: {
    templateKey: 'voting.contract_deployed',
    category: NotificationCategory.Vote,
    priority: NotificationPriority.Medium,
    channels: { email: false, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Voting contract deployed successfully',
  },
  // Messaging events
  [NotificationEventType.MessageReceived]: {
    templateKey: 'message.received',
    category: NotificationCategory.Messaging,
    priority: NotificationPriority.Medium,
    channels: { email: false, inApp: true, webhook: false, slack: true },
    defaultMessage: payload => `New message from ${payload.senderName ?? 'a user'}`,
  },
  // Usage events
  [NotificationEventType.UsageLimitWarning]: {
    templateKey: 'usage.limit_warning',
    category: NotificationCategory.Usage,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: payload => `Usage limit warning: ${payload.percentage ?? '90'}% of quota used`,
  },
  [NotificationEventType.UsageLimitExceeded]: {
    templateKey: 'usage.limit_exceeded',
    category: NotificationCategory.Usage,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Usage limit exceeded',
  },
  // Settings events
  [NotificationEventType.SettingsChanged]: {
    templateKey: 'settings.changed',
    category: NotificationCategory.Settings,
    priority: NotificationPriority.Low,
    channels: { email: false, inApp: true, webhook: false, slack: false },
    defaultMessage: () => 'Settings updated',
  },
  // Bulk events
  [NotificationEventType.BulkNotificationSent]: {
    templateKey: 'bulk.notification_sent',
    category: NotificationCategory.Bulk,
    priority: NotificationPriority.Low,
    channels: { email: false, inApp: false, webhook: false, slack: true },
    defaultMessage: payload => `Bulk notification sent to ${payload.recipientCount ?? 'multiple'} recipients`,
  },
  // System events
  [NotificationEventType.SystemMaintenance]: {
    templateKey: 'system.maintenance',
    category: NotificationCategory.System,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'System maintenance scheduled',
  },
  // Billing events
  [NotificationEventType.PaymentFailedRetry]: {
    templateKey: 'billing.payment_failed_retry',
    category: NotificationCategory.Billing,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Payment retry failed',
  },
  // Account events
  [NotificationEventType.AccountDeactivated]: {
    templateKey: 'account.deactivated',
    category: NotificationCategory.Account,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Account deactivated',
  },
  [NotificationEventType.AccountAccessRevoked]: {
    templateKey: 'account.access_revoked',
    category: NotificationCategory.Account,
    priority: NotificationPriority.High,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Account access revoked',
  },
  [NotificationEventType.AccountAccessRestored]: {
    templateKey: 'account.access_restored',
    category: NotificationCategory.Account,
    priority: NotificationPriority.Medium,
    channels: { email: true, inApp: true, webhook: false, slack: true },
    defaultMessage: () => 'Account access restored',
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
