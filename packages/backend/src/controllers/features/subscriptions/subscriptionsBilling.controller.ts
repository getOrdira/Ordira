// src/controllers/features/subscriptions/subscriptionsBilling.controller.ts
// Controller mapping billing related endpoints

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';
import { billingDataService } from '../../../services/subscriptions/core/billingData.service';
import type { PlanKey } from '../../../constants/plans';

interface CheckoutSessionRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    plan: PlanKey;
    couponCode?: string;
    addons?: string[];
    metadata?: Record<string, unknown>;
  };
}

interface PaymentMethodRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    paymentMethodId: string;
    setAsDefault?: boolean;
  };
}

interface BillingProfileRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    billingAddress?: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      line2?: string;
    };
    taxId?: string;
    companyName?: string;
    additionalMetadata?: Record<string, unknown>;
  };
}

interface TokenDiscountUpdateRequest extends SubscriptionsBaseRequest {
  validatedBody?: {
    walletAddress?: string;
  };
}

interface PricingSummaryQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    plan: PlanKey;
    couponCode?: string;
    addons?: string;
  };
}

/**
 * SubscriptionsBillingController exposes billing management operations.
 */
export class SubscriptionsBillingController extends SubscriptionsBaseController {
  /**
   * Retrieve billing information stored for the business.
   */
  async getBillingInfo(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_BILLING_INFO');

        const billing = await this.subscriptionBillingService.getBillingInfo(businessId);

        this.logAction(req, 'GET_BILLING_INFO_SUCCESS', {
          businessId,
          hasBillingRecord: Boolean(billing),
        });

        return { billing };
      });
    }, res, 'Billing information retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a comprehensive billing summary including usage and invoices.
   */
  async getComprehensiveBillingInfo(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_COMPREHENSIVE_BILLING');

        const summary = await this.subscriptionBillingService.getComprehensiveBillingInfo(businessId);

        this.logAction(req, 'GET_COMPREHENSIVE_BILLING_SUCCESS', {
          businessId,
          invoiceCount: summary.invoices?.length ?? 0,
        });

        return { summary };
      });
    }, res, 'Comprehensive billing information retrieved', this.getRequestMeta(req));
  }

  /**
   * Create a Stripe checkout session for subscription purchase or upgrade.
   */
  async createCheckoutSession(req: CheckoutSessionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'CREATE_CHECKOUT_SESSION');

        const session = await this.subscriptionBillingService.createCheckoutSession({
          businessId,
          plan: req.validatedBody.plan,
          couponCode: req.validatedBody.couponCode,
          addons: req.validatedBody.addons ?? [],
          metadata: req.validatedBody.metadata ?? {},
        });

        this.logAction(req, 'CREATE_CHECKOUT_SESSION_SUCCESS', {
          businessId,
          plan: req.validatedBody.plan,
        });

        return { session };
      });
    }, res, 'Checkout session created successfully', this.getRequestMeta(req));
  }

  /**
   * Update the default payment method for the subscription.
   */
  async updatePaymentMethod(req: PaymentMethodRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'UPDATE_PAYMENT_METHOD');

        const result = await this.subscriptionBillingService.updatePaymentMethod(
          businessId,
          req.validatedBody.paymentMethodId
        );

        this.logAction(req, 'UPDATE_PAYMENT_METHOD_SUCCESS', {
          businessId,
          paymentMethodId: req.validatedBody.paymentMethodId,
        });

        return { result };
      });
    }, res, 'Payment method updated successfully', this.getRequestMeta(req));
  }

  /**
   * Update billing profile metadata stored in the Billing collection.
   */
  async updateBillingProfile(req: BillingProfileRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'UPDATE_BILLING_PROFILE');

        await billingDataService.upsertBilling(businessId, {
          billingAddress: req.validatedBody.billingAddress,
          taxId: req.validatedBody.taxId,
          companyName: req.validatedBody.companyName,
          metadata: req.validatedBody.additionalMetadata,
        });

        const updated = await billingDataService.getBillingByBusinessId(businessId);

        this.logAction(req, 'UPDATE_BILLING_PROFILE_SUCCESS', {
          businessId,
          hasBillingRecord: Boolean(updated),
        });

        return { billing: updated };
      });
    }, res, 'Billing profile updated successfully', this.getRequestMeta(req));
  }

  /**
   * Refresh token discount information based on wallet balance.
   */
  async refreshTokenDiscounts(req: TokenDiscountUpdateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'REFRESH_TOKEN_DISCOUNTS');

        const result = await this.subscriptionBillingService.updateTokenDiscounts(
          businessId,
          this.parseString(req.validatedBody?.walletAddress),
        );

        this.logAction(req, 'REFRESH_TOKEN_DISCOUNTS_SUCCESS', {
          businessId,
          hasDiscounts: Boolean(result?.hasDiscounts),
        });

        return { result };
      });
    }, res, 'Token discounts refreshed', this.getRequestMeta(req));
  }

  /**
   * Remove token-based discounts from the subscription.
   */
  async removeTokenDiscounts(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'REMOVE_TOKEN_DISCOUNTS');

        const result = await this.subscriptionBillingService.removeTokenDiscounts(businessId);

        this.logAction(req, 'REMOVE_TOKEN_DISCOUNTS_SUCCESS', {
          businessId,
          subscriptionUpdated: Boolean(result?.subscriptionUpdated),
        });

        return { result };
      });
    }, res, 'Token discounts removed', this.getRequestMeta(req));
  }

  /**
   * Calculate pricing summary for a plan with optional coupon/add-ons.
   */
  async calculatePricingSummary(req: PricingSummaryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const plan = req.validatedQuery?.plan;
      if (!plan) {
        throw { statusCode: 400, message: 'Plan identifier is required' };
      }

      const addons = req.validatedQuery?.addons
        ? req.validatedQuery.addons.split(',').map((addon) => addon.trim()).filter(Boolean)
        : [];

      this.recordPerformance(req, 'CALCULATE_PRICING_SUMMARY');

      const summary = await this.subscriptionBillingService.calculatePricingSummary(
        plan,
        req.validatedQuery?.couponCode,
        addons,
      );

      this.logAction(req, 'CALCULATE_PRICING_SUMMARY_SUCCESS', {
        plan,
        addonCount: addons.length,
      });

      return { summary };
    }, res, 'Pricing summary calculated successfully', this.getRequestMeta(req));
  }

  /**
   * Check whether overage billing is enabled for the business.
   */
  async getOverageBillingStatus(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_OVERAGE_BILLING_STATUS');

        const status = await this.subscriptionBillingService.isOverageBillingEnabled(businessId);

        this.logAction(req, 'GET_OVERAGE_BILLING_STATUS_SUCCESS', {
          businessId,
          enabled: status.enabled,
        });

        return { status };
      });
    }, res, 'Overage billing status retrieved', this.getRequestMeta(req));
  }
}

export const subscriptionsBillingController = new SubscriptionsBillingController();
