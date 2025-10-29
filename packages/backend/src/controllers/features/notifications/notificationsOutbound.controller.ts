// src/controllers/features/notifications/notificationsOutbound.controller.ts
// Controller exposing helper endpoints for outbound notification workflows

import { Response, NextFunction } from 'express';
import { BaseRequest } from '../../core/base.controller';
import { NotificationsBaseController } from './notificationsBase.controller';

interface SubscriptionPlanChangeRequest extends BaseRequest {
  validatedBody: {
    businessId?: string;
    email: string;
    oldPlan: string;
    newPlan: string;
  };
}

interface SubscriptionCancellationRequest extends BaseRequest {
  validatedBody: {
    businessId?: string;
    email: string;
    plan: string;
  };
}

interface SubscriptionRenewalRequest extends BaseRequest {
  validatedBody: {
    businessId?: string;
    email: string;
    plan: string;
    amount: number;
  };
}

interface PaymentFailedRequest extends BaseRequest {
  validatedBody: {
    businessId?: string;
    email: string;
    invoiceId: string;
  };
}

interface SubscriptionWelcomeRequest extends BaseRequest {
  validatedBody: {
    businessId: string;
    tier: string;
  };
}

interface AccountDeletionRequest extends BaseRequest {
  validatedBody: {
    email: string;
    reason?: string;
  };
}

/**
 * NotificationsOutboundController offers thin wrappers around outbound notification helpers.
 */
export class NotificationsOutboundController extends NotificationsBaseController {
  private outboundService = this.notificationsServices.features.outboundNotificationService;

  /**
   * Notify subscribers about plan changes.
   */
  async sendPlanChange(req: SubscriptionPlanChangeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { businessId, email, oldPlan, newPlan } = req.validatedBody;

      this.recordPerformance(req, 'SEND_PLAN_CHANGE_NOTIFICATION');

      await this.outboundService.sendPlanChangeNotification(businessId, email, oldPlan, newPlan);

      this.logAction(req, 'SEND_PLAN_CHANGE_NOTIFICATION_SUCCESS', {
        businessId,
        email,
        oldPlan,
        newPlan,
      });

      return { sent: true };
    }, res, 'Plan change notification sent', this.getRequestMeta(req));
  }

  /**
   * Send subscription cancellation confirmation.
   */
  async sendCancellation(req: SubscriptionCancellationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { businessId, email, plan } = req.validatedBody;

      this.recordPerformance(req, 'SEND_SUBSCRIPTION_CANCELLATION');

      await this.outboundService.sendCancellationConfirmation(businessId, email, plan);

      this.logAction(req, 'SEND_SUBSCRIPTION_CANCELLATION_SUCCESS', {
        businessId,
        email,
        plan,
      });

      return { sent: true };
    }, res, 'Subscription cancellation notification sent', this.getRequestMeta(req));
  }

  /**
   * Send subscription renewal confirmation.
   */
  async sendRenewal(req: SubscriptionRenewalRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { businessId, email, plan, amount } = req.validatedBody;

      this.recordPerformance(req, 'SEND_SUBSCRIPTION_RENEWAL');

      await this.outboundService.sendRenewalConfirmation(businessId, email, plan, amount);

      this.logAction(req, 'SEND_SUBSCRIPTION_RENEWAL_SUCCESS', {
        businessId,
        email,
        plan,
        amount,
      });

      return { sent: true };
    }, res, 'Subscription renewal notification sent', this.getRequestMeta(req));
  }

  /**
   * Send payment failure notification.
   */
  async sendPaymentFailed(req: PaymentFailedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { businessId, email, invoiceId } = req.validatedBody;

      this.recordPerformance(req, 'SEND_PAYMENT_FAILED_NOTIFICATION');

      await this.outboundService.sendPaymentFailedNotification(businessId, email, invoiceId);

      this.logAction(req, 'SEND_PAYMENT_FAILED_NOTIFICATION_SUCCESS', {
        businessId,
        email,
        invoiceId,
      });

      return { sent: true };
    }, res, 'Payment failure notification sent', this.getRequestMeta(req));
  }

  /**
   * Send welcome notification for new subscriptions.
   */
  async sendSubscriptionWelcome(req: SubscriptionWelcomeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { businessId, tier } = req.validatedBody;

      this.recordPerformance(req, 'SEND_SUBSCRIPTION_WELCOME');

      await this.outboundService.sendSubscriptionWelcome(businessId, tier);

      this.logAction(req, 'SEND_SUBSCRIPTION_WELCOME_SUCCESS', {
        businessId,
        tier,
      });

      return { sent: true };
    }, res, 'Subscription welcome notification sent', this.getRequestMeta(req));
  }

  /**
   * Send account deletion confirmation notification.
   */
  async sendAccountDeletionConfirmation(req: AccountDeletionRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { email, reason } = req.validatedBody;

      this.recordPerformance(req, 'SEND_ACCOUNT_DELETION_CONFIRMATION');

      await this.outboundService.sendAccountDeletionConfirmation(email, reason);

      this.logAction(req, 'SEND_ACCOUNT_DELETION_CONFIRMATION_SUCCESS', {
        email,
        reason,
      });

      return { sent: true };
    }, res, 'Account deletion confirmation sent', this.getRequestMeta(req));
  }
}

export const notificationsOutboundController = new NotificationsOutboundController();
