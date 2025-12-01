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
   * Provision a new subscription for the provided business or manufacturer.
   */
  async createSubscription(req: CreateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      
      // Determine plan type from user type or request body
      const planType = req.validatedBody.planType || 
        (req.userType === 'manufacturer' ? 'manufacturer' : 'brand');
      
      // Resolve entity ID based on plan type
      let entityId: string | undefined;
      if (planType === 'manufacturer') {
        // For manufacturers, businessId field in the request can contain manufacturerId
        entityId = req.validatedBody.businessId ?? this.resolveManufacturerId(req, false);
      } else {
        entityId = req.validatedBody.businessId ?? this.resolveBusinessId(req, false);
      }
      
      if (!entityId) {
        const entityType = planType === 'manufacturer' ? 'Manufacturer' : 'Business';
        throw { statusCode: 400, message: `${entityType} identifier is required` };
      }

      const payload: CreateSubscriptionInput = {
        ...req.validatedBody,
        businessId: entityId, // businessId field is used for both business and manufacturer IDs
        planType,
      };

      this.recordPerformance(req, 'CREATE_SUBSCRIPTION');

      const subscription = await this.subscriptionLifecycleService.createSubscription(payload);

      this.logAction(req, 'CREATE_SUBSCRIPTION_SUCCESS', {
        entityId,
        planType,
        tier: subscription.tier,
      });

      return { subscription };
    }, res, 'Subscription created successfully', this.getRequestMeta(req));
  }

  /**
   * Update subscription attributes such as tier, status, or billing cycle.
   * Supports both business and manufacturer users.
   */
  async updateSubscription(req: UpdateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      // Support both business and manufacturer users
      const entityInfo = this.resolveEntityId(req);
      if (!entityInfo) {
        // Fallback to business user validation for backward compatibility
        return await this.validateBusinessUser(req, res, async () => {
          const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
          if (!businessId) {
            throw { statusCode: 400, message: 'Business or manufacturer identifier is required' };
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
      }

      // Validate user has access (business or manufacturer)
      if (entityInfo.planType === 'brand') {
        return await this.validateBusinessUser(req, res, async () => {
          this.recordPerformance(req, 'UPDATE_SUBSCRIPTION');

          const updated = await this.subscriptionLifecycleService.updateSubscription(
            entityInfo.entityId,
            req.validatedBody,
            entityInfo.planType,
          );

          this.logAction(req, 'UPDATE_SUBSCRIPTION_SUCCESS', {
            entityId: entityInfo.entityId,
            planType: entityInfo.planType,
            changes: Object.keys(req.validatedBody),
          });

          return { subscription: updated };
        });
      } else {
        // Manufacturer user
        return await this.validateManufacturerUser(req, res, async () => {
          this.recordPerformance(req, 'UPDATE_SUBSCRIPTION');

          const updated = await this.subscriptionLifecycleService.updateSubscription(
            entityInfo.entityId,
            req.validatedBody,
            entityInfo.planType,
          );

          this.logAction(req, 'UPDATE_SUBSCRIPTION_SUCCESS', {
            entityId: entityInfo.entityId,
            planType: entityInfo.planType,
            changes: Object.keys(req.validatedBody),
          });

          return { subscription: updated };
        });
      }
    }, res, 'Subscription updated successfully', this.getRequestMeta(req));
  }

  /**
   * Cancel a subscription immediately or at the end of the billing period.
   * Supports both business and manufacturer users.
   */
  async cancelSubscription(req: CancelSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const entityInfo = this.resolveEntityId(req);
      if (!entityInfo) {
        // Fallback to business user validation for backward compatibility
        return await this.validateBusinessUser(req, res, async () => {
          const businessId = req.validatedBody?.businessId ?? this.resolveBusinessId(req);
          if (!businessId) {
            throw { statusCode: 400, message: 'Business or manufacturer identifier is required' };
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
      }

      // Validate user has access
      const validateFn = entityInfo.planType === 'brand' 
        ? this.validateBusinessUser.bind(this)
        : this.validateManufacturerUser.bind(this);

      return await validateFn(req, res, async () => {
        const cancelImmediately = Boolean(req.validatedBody?.cancelImmediately);

        this.recordPerformance(req, 'CANCEL_SUBSCRIPTION');

        const result = await this.subscriptionLifecycleService.cancelSubscription(
          entityInfo.entityId,
          cancelImmediately,
          req.validatedBody?.reason,
          entityInfo.planType,
        );

        this.logAction(req, 'CANCEL_SUBSCRIPTION_SUCCESS', {
          entityId: entityInfo.entityId,
          planType: entityInfo.planType,
          cancelImmediately,
          effectiveDate: result.effectiveDate,
        });

        return { cancellation: result };
      });
    }, res, 'Subscription cancellation processed', this.getRequestMeta(req));
  }

  /**
   * Reactivate a subscription by clearing cancellation flags and restoring active status.
   * Supports both business and manufacturer users.
   */
  async reactivateSubscription(req: UpdateSubscriptionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const entityInfo = this.resolveEntityId(req);
      if (!entityInfo) {
        // Fallback to business user validation for backward compatibility
        return await this.validateBusinessUser(req, res, async () => {
          const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
          if (!businessId) {
            throw { statusCode: 400, message: 'Business or manufacturer identifier is required' };
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
      }

      // Validate user has access
      const validateFn = entityInfo.planType === 'brand' 
        ? this.validateBusinessUser.bind(this)
        : this.validateManufacturerUser.bind(this);

      return await validateFn(req, res, async () => {
        this.recordPerformance(req, 'REACTIVATE_SUBSCRIPTION');

        const subscription = await this.subscriptionLifecycleService.updateSubscription(
          entityInfo.entityId,
          { status: 'active', cancelAtPeriodEnd: false },
          entityInfo.planType,
        );

        this.logAction(req, 'REACTIVATE_SUBSCRIPTION_SUCCESS', {
          entityId: entityInfo.entityId,
          planType: entityInfo.planType,
          status: subscription.status,
        });

        return { subscription };
      });
    }, res, 'Subscription reactivated successfully', this.getRequestMeta(req));
  }
}

export const subscriptionsLifecycleController = new SubscriptionsLifecycleController();
