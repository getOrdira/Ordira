import { BrandSettings } from '../../models/brandSettings.model';
import { StripeService } from './stripe.service';
import { TokenDiscountService } from './tokenDiscount.service';
import { PlanKey } from '../../constants/plans';

export class BillingService {
  private stripeService = new StripeService();
  private tokenDiscountService = new TokenDiscountService();

  async createOrUpdateSubscription(businessId: string, plan: PlanKey): Promise<any> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings) throw new Error('Brand settings not found');

    let customerId = settings.stripeCustomerId;

    // Create customer if needed
    if (!customerId) {
      // Would need business email - get from Business model
      customerId = await this.stripeService.createCustomer(businessId, 'business@example.com');
      settings.stripeCustomerId = customerId;
    }

    // Check for token discounts
    let couponId: string | undefined;
    if (settings.certificateWallet) {
      couponId = await this.tokenDiscountService.getCouponForWallet(settings.certificateWallet);
    }

    let subscription;
    if (settings.stripeSubscriptionId) {
      subscription = await this.stripeService.updateSubscription(settings.stripeSubscriptionId, plan, couponId);
    } else {
      subscription = await this.stripeService.createSubscription(customerId, plan, couponId);
      settings.stripeSubscriptionId = subscription.id;
    }

    settings.plan = plan;
    await settings.save();
    return subscription;
  }

  async chargeOverage(businessId: string, amount: number, description: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.stripeCustomerId) {
      throw new Error(`No Stripe customer configured for business ${businessId}`);
    }

    await this.stripeService.chargeCustomer(settings.stripeCustomerId, amount, description);
  }

  async getBillingInfo(businessId: string) {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings || !settings.stripeCustomerId || !settings.plan) {
      throw new Error('No subscription found');
    }

    return {
      stripeCustomerId: settings.stripeCustomerId,
      plan: settings.plan as PlanKey
    };
  }

  /**
   * Handle subscription renewal - re-apply any token-based discounts
   */
  async processRenewal(subscriptionId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ stripeSubscriptionId: subscriptionId });
    if (!settings) {
      throw new Error(`No BrandSettings for subscription ${subscriptionId}`);
    }

    // Check for updated token discount
    let couponId: string | undefined;
    if (settings.certificateWallet) {
      couponId = await this.tokenDiscountService.getCouponForWallet(settings.certificateWallet);
    }

    // Update subscription with new coupon if applicable
    if (couponId) {
      await this.stripeService.applyCouponToSubscription(subscriptionId, couponId);
    }
  }

  /**
   * Get detailed billing information including discounts
   */
  async getDetailedBillingInfo(businessId: string) {
    const basicInfo = await this.getBillingInfo(businessId);
    const settings = await BrandSettings.findOne({ business: businessId });
    
    let discountInfo = null;
    if (settings?.certificateWallet) {
      discountInfo = await this.tokenDiscountService.getDiscountInfoForWallet(settings.certificateWallet);
    }

    return {
      ...basicInfo,
      discountInfo
    };
  }
}