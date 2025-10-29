// src/controllers/features/subscriptions/subscriptionsLifecycle.controller.ts
// Controller orchestrating subscription lifecycle operations

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '../../../services/subscriptions/utils/types';

interface CreateSubscriptionRequest extends SubscriptionsBaseRequest {
  validatedBody: CreateSubscriptionInput;
}

interface UpdateSubscriptionRequest extends SubscriptionsBaseRequest {
  validatedBody: UpdateSubscriptionInput & { businessId?: string };
}

interface CancelSubscriptionRequest extends SubscriptionsBaseRequest {
  validatedBody?: {
    businessId?: string;
    cancelImmediately?: boolean;
    reason?: string;
  };
}

/**
 * SubscriptionsLifecycleController maps lifecycle actions to the lifecycle service.
 */
export class SubscriptionsLifecycleController extends SubscriptionsBaseController {
  /**
   * Provision a new subscription for the provided business.
   */
  async createSubscription(req: CreateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req, false);
      if (!businessId) {
        throw { statusCode: 400, message: 'Business identifier is required' };
      }

      const payload: CreateSubscriptionInput = {
        ...req.validatedBody,
        businessId,
      };

      this.recordPerformance(req, 'CREATE_SUBSCRIPTION');

      const subscription = await this.subscriptionLifecycleService.createSubscription(payload);

      this.logAction(req, 'CREATE_SUBSCRIPTION_SUCCESS', {
        businessId,
        tier: subscription.tier,
      });

      return { subscription };
    }, res, 'Subscription created successfully', this.getRequestMeta(req));
  }

  /**
   * Update subscription attributes such as tier, status, or billing cycle.
   */
  async updateSubscription(req: UpdateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'UPDATE_SUBSCRIPTION');

        const updated = await this.subscriptionLifecycleService.updateSubscription(
          businessId,
          req.validatedBody,
        );

        this.logAction(req, 'UPDATE_SUBSCRIPTION_SUCCESS', {
          businessId,
          changes: Object.keys(req.validatedBody),
        });

        return { subscription: updated };
      });
    }, res, 'Subscription updated successfully', this.getRequestMeta(req));
  }

  /**
   * Cancel a subscription immediately or at the end of the billing period.
   */
  async cancelSubscription(req: CancelSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody?.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const cancelImmediately = Boolean(req.validatedBody?.cancelImmediately);

        this.recordPerformance(req, 'CANCEL_SUBSCRIPTION');

        const result = await this.subscriptionLifecycleService.cancelSubscription(
          businessId,
          cancelImmediately,
          req.validatedBody?.reason,
        );

        this.logAction(req, 'CANCEL_SUBSCRIPTION_SUCCESS', {
          businessId,
          cancelImmediately,
          effectiveDate: result.effectiveDate,
        });

        return { cancellation: result };
      });
    }, res, 'Subscription cancellation processed', this.getRequestMeta(req));
  }

  /**
   * Reactivate a subscription by clearing cancellation flags and restoring active status.
   */
  async reactivateSubscription(req: UpdateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'REACTIVATE_SUBSCRIPTION');

        const subscription = await this.subscriptionLifecycleService.updateSubscription(
          businessId,
          { status: 'active', cancelAtPeriodEnd: false },
        );

        this.logAction(req, 'REACTIVATE_SUBSCRIPTION_SUCCESS', {
          businessId,
          status: subscription.status,
        });

        return { subscription };
      });
    }, res, 'Subscription reactivated successfully', this.getRequestMeta(req));
  }
}

export const subscriptionsLifecycleController = new SubscriptionsLifecycleController();
