import { BillingService } from '../../external/billing.service';
import { outboundNotificationService } from '../../notifications';
import { Subscription } from '../../../models/subscription.model';
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionSummary,
  SubscriptionDocument
} from '../utils/types';
import {
  getBrandAllowOverage,
  getBrandPlanDefinition,
  getBrandUsageLimits,
  isBrandPlan
} from '../utils/planCatalog';
import { BrandPlanKey } from '../utils/types';
import { SubscriptionDataService, subscriptionDataService } from './subscriptionData.service';
import { SubscriptionPlanValidationService, subscriptionPlanValidationService } from '../validation/planValidation.service';
import { SubscriptionError } from '../utils/errors';

export class SubscriptionLifecycleService {
  constructor(
    private readonly dataService: SubscriptionDataService = subscriptionDataService,
    private readonly planValidationService: SubscriptionPlanValidationService = subscriptionPlanValidationService,
    private readonly billingService: BillingService = new BillingService()
  ) {}

  /**
   * Create a new subscription for the provided business, aligning plan limits and billing metadata.
   */
  async createSubscription(data: CreateSubscriptionInput): Promise<SubscriptionSummary> {
    const existing = await this.dataService.findByBusiness(data.businessId);
    if (existing) {
      throw new SubscriptionError('Subscription already exists for this business', 409);
    }

    if (!isBrandPlan(data.tier)) {
      throw new SubscriptionError(`Unsupported subscription tier: ${data.tier}`, 400);
    }

    const trialEndsAt = data.isTrialPeriod && data.trialDays
      ? this.addDays(new Date(), data.trialDays)
      : undefined;

    const nextBillingDate = this.computeNextBillingDate(data.billingCycle ?? 'monthly');
    const planLimits = getBrandUsageLimits(data.tier);
    const planDefinition = getBrandPlanDefinition(data.tier);

    const subscription = await Subscription.create({
      business: data.businessId,
      tier: data.tier,
      billingCycle: data.billingCycle ?? 'monthly',
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId: planDefinition?.stripePriceId,
      isTrialPeriod: Boolean(data.isTrialPeriod),
      trialEndsAt,
      nextBillingDate,
      status: 'active',
      voteLimit: planLimits.votes,
      nftLimit: planLimits.nfts,
      apiLimit: planLimits.api,
      storageLimit: planLimits.storage,
      allowOverage: getBrandAllowOverage(data.tier)
    });

    await outboundNotificationService.sendSubscriptionWelcome(
      data.businessId,
      subscription.tier
    );

    return this.dataService.toSummary(subscription);
  }

  /**
   * Update subscription tier, status, or billing cycle while enforcing plan validation.
   */
  async updateSubscription(
    businessId: string,
    updates: UpdateSubscriptionInput
  ): Promise<SubscriptionSummary> {
        const subscription = await this.dataService.requireByBusiness(businessId);
        const previousTier = subscription.tier;

    if (updates.tier && updates.tier !== subscription.tier) {
      const validation = this.planValidationService.validateTierChange(
        subscription,
        updates.tier
      );

      if (!validation.allowed) {
        throw new SubscriptionError(
          `Tier change not allowed: ${validation.reasons?.join(', ')}`,
          400
        );
      }

      if (isBrandPlan(updates.tier)) {
        const limits = getBrandUsageLimits(updates.tier);
        subscription.voteLimit = limits.votes;
        subscription.nftLimit = limits.nfts;
        subscription.apiLimit = limits.api;
        subscription.storageLimit = limits.storage;
        subscription.allowOverage = getBrandAllowOverage(updates.tier);
        subscription.stripePriceId = getBrandPlanDefinition(updates.tier)?.stripePriceId;
      }
    }

    if (typeof updates.status !== 'undefined') {
      subscription.status = updates.status;
    }

    if (updates.billingCycle) {
      subscription.billingCycle = updates.billingCycle;
      subscription.nextBillingDate = this.computeNextBillingDate(updates.billingCycle);
    }

    if (updates.tier) {
      subscription.tier = updates.tier as BrandPlanKey;
    }

    if (typeof updates.cancelAtPeriodEnd !== 'undefined') {
      subscription.cancelAtPeriodEnd = Boolean(updates.cancelAtPeriodEnd);
    }

    await subscription.save();

    if (updates.tier || updates.billingCycle) {
      await this.billingService.changePlan(businessId, subscription.tier, {
        billingCycle: subscription.billingCycle
      });
    }

    if (updates.tier) {
      const contact = await this.dataService.getBusinessContact(businessId);
      if (contact?.email) {
        await         await outboundNotificationService.sendPlanChangeNotification(businessId, contact.email, previousTier, updates.tier);
      }
    }

    return this.dataService.toSummary(subscription);
  }

  /**
   * Cancel a subscription either immediately or at the billing period end.
   */
  async cancelSubscription(
    businessId: string,
    cancelImmediately = false,
    reason?: string
  ): Promise<{ canceledAt: Date; effectiveDate: Date; refund?: number }> {
        const subscription = await this.dataService.requireByBusiness(businessId);
        const previousTier = subscription.tier;

    if (subscription.status === 'canceled') {
      throw new SubscriptionError('Subscription is already canceled', 400);
    }

    const canceledAt = new Date();
    let effectiveDate: Date;
    let refund: number | undefined;

    if (cancelImmediately) {
      effectiveDate = canceledAt;
      subscription.status = 'canceled';
      refund = await this.calculateProratedRefund(subscription);
    } else {
      effectiveDate = subscription.nextBillingDate;
      subscription.cancelAtPeriodEnd = true;
    }

    subscription.billingHistory.push({
      date: new Date(),
      amount: refund ?? 0,
      type: 'subscription',
      description: `Subscription canceled: ${reason || 'No reason provided'}`,
      status: refund ? 'pending' : 'paid'
    });

    await subscription.save();

    if (subscription.stripeSubscriptionId) {
      await this.billingService.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelImmediately
      );
    }

    await outboundNotificationService.sendCancellationNotification(
      businessId,
      effectiveDate,
      refund,
      subscription.tier
    );

    return {
      canceledAt,
      effectiveDate,
      refund
    };
  }

  private computeNextBillingDate(cycle: 'monthly' | 'yearly'): Date {
    const next = new Date();
    if (cycle === 'yearly') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private async calculateProratedRefund(subscription: SubscriptionDocument): Promise<number> {
    if (!subscription.lastPaymentDate || !subscription.nextPaymentAmount) {
      return 0;
    }

    const now = new Date();
    const totalPeriod = subscription.nextBillingDate.getTime() - subscription.lastPaymentDate.getTime();
    const remainingPeriod = subscription.nextBillingDate.getTime() - now.getTime();

    if (totalPeriod <= 0 || remainingPeriod <= 0) {
      return 0;
    }

    const refundPercentage = remainingPeriod / totalPeriod;
    return Math.round(subscription.nextPaymentAmount * refundPercentage);
  }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();

