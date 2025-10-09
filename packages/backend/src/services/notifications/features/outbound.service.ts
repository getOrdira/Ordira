import { Business } from '../../../models/business.model';
import { logger } from '../../../utils/logger';
import { triggersService } from './triggers.service';
import { NotificationEventType } from '../types';

export class OutboundNotificationService {
  async sendPlanChangeNotification(businessId: string | undefined, email: string, oldPlan: string, newPlan: string): Promise<void> {
    await triggersService.handle({
      type: NotificationEventType.SubscriptionPlanChanged,
      recipient: { businessId, email },
      payload: {
        oldPlan,
        newPlan,
        changeDate: new Date().toLocaleDateString(),
      },
    });
  }

  async sendCancellationConfirmation(businessId: string | undefined, email: string, plan: string): Promise<void> {
    await triggersService.handle({
      type: NotificationEventType.SubscriptionCancelled,
      recipient: { businessId, email },
      payload: {
        plan,
        cancelDate: new Date().toLocaleDateString(),
      },
    });
  }

  async sendRenewalConfirmation(businessId: string | undefined, email: string, plan: string, amount: number): Promise<void> {
    await triggersService.handle({
      type: NotificationEventType.SubscriptionRenewed,
      recipient: { businessId, email },
      payload: {
        plan,
        amount,
        renewalDate: new Date().toLocaleDateString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    });
  }

  async sendPaymentFailedNotification(businessId: string | undefined, email: string, invoiceId: string): Promise<void> {
    await triggersService.handle({
      type: NotificationEventType.PaymentFailed,
      recipient: { businessId, email },
      payload: {
        invoiceId,
        failureDate: new Date().toLocaleDateString(),
        retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    });
  }

  async sendSubscriptionWelcome(businessId: string, tier: string): Promise<void> {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found for subscription welcome');
      }

      await triggersService.handle({
        type: NotificationEventType.SubscriptionWelcome,
        recipient: { businessId, email: business.email },
        payload: {
          plan: tier,
          businessName: business.businessName || `${business.firstName} ${business.lastName}`,
          welcomeDate: new Date().toLocaleDateString(),
        },
      });

      logger.info(`Subscription welcome sent to: ${business.email} for ${tier} plan`);
    } catch (error) {
      logger.error('Failed to send subscription welcome:', error);
    }
  }

  async sendCancellationNotification(businessId: string, effectiveDate: Date, refund?: any, planName?: string): Promise<void> {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw new Error('Business not found for cancellation notification');
      }

      await triggersService.handle({
        type: NotificationEventType.SubscriptionCancelled,
        recipient: { businessId, email: business.email },
        payload: {
          plan: planName || 'subscription',
          cancelDate: new Date().toLocaleDateString(),
          effectiveDate: effectiveDate.toLocaleDateString(),
          refundAmount: refund ? refund.amount : undefined,
        },
      });

      logger.info(`Cancellation notification sent to: ${business.email}`);
    } catch (error) {
      logger.error('Failed to send cancellation notification:', error);
    }
  }

  async sendAccountDeletionConfirmation(email: string, reason?: string): Promise<void> {
    await triggersService.handle({
      type: NotificationEventType.AccountDeletionConfirmed,
      recipient: { email },
      payload: {
        deletionReason: reason,
        deletionDate: new Date().toLocaleDateString(),
      },
    });
  }
}

export const outboundNotificationService = new OutboundNotificationService();
