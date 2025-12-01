import { BillingManagementService, billingManagementService } from '../features/billingManagement.service';
import { outboundNotificationService } from '../../notifications';
import { Subscription, ISubscription } from '../../../models/subscription/subscription.model';
import {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionSummary,
  SubscriptionDocument,
  SubscriptionUsageMetrics
} from '../utils/types';
import {
  getBrandAllowOverage,
  getBrandPlanDefinition,
  getBrandUsageLimits,
  getManufacturerAllowOverage,
  getManufacturerPlanDefinition,
  getManufacturerUsageLimits,
  isBrandPlan,
  isManufacturerPlan
} from '../utils/planCatalog';
import { BrandPlanKey, ManufacturerPlanKey } from '../utils/types';
import { SubscriptionDataService, subscriptionDataService } from './subscriptionData.service';
import { SubscriptionPlanValidationService, subscriptionPlanValidationService } from '../validation/planValidation.service';
import { SubscriptionError } from '../utils/errors';

export class SubscriptionLifecycleService {
  constructor(
    private readonly dataService: SubscriptionDataService = subscriptionDataService,
    private readonly planValidationService: SubscriptionPlanValidationService = subscriptionPlanValidationService,
    private readonly billingService: BillingManagementService = billingManagementService
  ) {}

  /**
   * Create a new subscription for the provided business or manufacturer, aligning plan limits and billing metadata.
   */
  async createSubscription(data: CreateSubscriptionInput): Promise<SubscriptionSummary> {
    const planType = data.planType || (isBrandPlan(data.tier) ? 'brand' : 'manufacturer');
    
    // Check for existing subscription
    let existing: ISubscription | null = null;
    if (planType === 'brand') {
      existing = await this.dataService.findByBusiness(data.businessId);
    } else {
      existing = await this.dataService.findByManufacturer(data.businessId); // businessId is actually manufacturerId here
    }
    
    if (existing) {
      const entityType = planType === 'brand' ? 'business' : 'manufacturer';
      throw new SubscriptionError(`Subscription already exists for this ${entityType}`, 409);
    }

    // Validate tier matches plan type
    if (planType === 'brand' && !isBrandPlan(data.tier)) {
      throw new SubscriptionError(`Invalid tier ${data.tier} for brand plan`, 400);
    }
    if (planType === 'manufacturer' && !isManufacturerPlan(data.tier)) {
      throw new SubscriptionError(`Invalid tier ${data.tier} for manufacturer plan`, 400);
    }

    const trialEndsAt = data.isTrialPeriod && data.trialDays
      ? this.addDays(new Date(), data.trialDays)
      : undefined;

    const nextBillingDate = this.computeNextBillingDate(data.billingCycle ?? 'monthly');
    
    // Get plan limits and definition based on plan type
    let planLimits: SubscriptionUsageMetrics;
    let stripePriceId: string | undefined;
    let allowOverage: boolean;
    
    if (planType === 'brand') {
      planLimits = getBrandUsageLimits(data.tier as BrandPlanKey);
      const planDefinition = getBrandPlanDefinition(data.tier as BrandPlanKey);
      stripePriceId = planDefinition?.stripePriceId;
      allowOverage = getBrandAllowOverage(data.tier as BrandPlanKey);
    } else {
      planLimits = getManufacturerUsageLimits(data.tier as ManufacturerPlanKey);
      const planDefinition = getManufacturerPlanDefinition(data.tier as ManufacturerPlanKey);
      stripePriceId = planDefinition?.stripePriceId;
      allowOverage = getManufacturerAllowOverage(data.tier as ManufacturerPlanKey);
    }

    // Create subscription with appropriate entity reference
    const subscriptionData: any = {
      planType,
      tier: data.tier,
      billingCycle: data.billingCycle ?? 'monthly',
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripePriceId,
      isTrialPeriod: Boolean(data.isTrialPeriod),
      trialEndsAt,
      nextBillingDate,
      status: 'active',
      voteLimit: planLimits.votes,
      nftLimit: planLimits.nfts,
      apiLimit: planLimits.api,
      storageLimit: planLimits.storage,
      allowOverage
    };

    if (planType === 'brand') {
      subscriptionData.business = data.businessId;
    } else {
      subscriptionData.manufacturer = data.businessId; // businessId is actually manufacturerId
    }

    const subscription = await Subscription.create(subscriptionData);

    // Send welcome notification
    const entityId = planType === 'brand' 
      ? subscription.business?.toString() || data.businessId
      : subscription.manufacturer?.toString() || data.businessId;
    
    await outboundNotificationService.sendSubscriptionWelcome(
      entityId,
      subscription.tier
    );

    return this.dataService.toSummary(subscription);
  }

  /**
   * Update subscription tier, status, or billing cycle while enforcing plan validation.
   * Supports both brand and manufacturer subscriptions.
   */
  async updateSubscription(
    entityId: string,
    updates: UpdateSubscriptionInput,
    planType?: 'brand' | 'manufacturer'
  ): Promise<SubscriptionSummary> {
    // Determine plan type if not provided
    if (!planType) {
      // Try to find by business first, then manufacturer
      const byBusiness = await this.dataService.findByBusiness(entityId);
      if (byBusiness) {
        planType = 'brand';
      } else {
        const byManufacturer = await this.dataService.findByManufacturer(entityId);
        if (byManufacturer) {
          planType = 'manufacturer';
        } else {
          throw new SubscriptionError('Subscription not found', 404);
        }
      }
    }

    const subscription = await this.dataService.requireByEntity(entityId, planType);
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

      // Update limits based on plan type
      if (planType === 'brand' && isBrandPlan(updates.tier)) {
        const limits = getBrandUsageLimits(updates.tier as BrandPlanKey);
        subscription.voteLimit = limits.votes;
        subscription.nftLimit = limits.nfts;
        subscription.apiLimit = limits.api;
        subscription.storageLimit = limits.storage;
        subscription.allowOverage = getBrandAllowOverage(updates.tier as BrandPlanKey);
        subscription.stripePriceId = getBrandPlanDefinition(updates.tier as BrandPlanKey)?.stripePriceId;
      } else if (planType === 'manufacturer' && isManufacturerPlan(updates.tier)) {
        const limits = getManufacturerUsageLimits(updates.tier as ManufacturerPlanKey);
        subscription.voteLimit = limits.votes;
        subscription.nftLimit = limits.nfts;
        subscription.apiLimit = limits.api;
        subscription.storageLimit = limits.storage;
        subscription.allowOverage = getManufacturerAllowOverage(updates.tier as ManufacturerPlanKey);
        subscription.stripePriceId = getManufacturerPlanDefinition(updates.tier as ManufacturerPlanKey)?.stripePriceId;
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
      subscription.tier = updates.tier as BrandPlanKey | ManufacturerPlanKey;
    }

    if (typeof updates.cancelAtPeriodEnd !== 'undefined') {
      subscription.cancelAtPeriodEnd = Boolean(updates.cancelAtPeriodEnd);
    }

    await subscription.save();

    if (updates.tier || updates.billingCycle) {
      await this.billingService.changePlan(entityId, subscription.tier, {
        billingCycle: subscription.billingCycle
      });
    }

    if (updates.tier) {
      // Get contact email for notification
      let contact;
      if (planType === 'brand') {
        contact = await this.dataService.getBusinessContact(entityId);
      } else {
        contact = await this.dataService.getManufacturerContact(entityId);
      }
      
      if (contact?.email) {
        await outboundNotificationService.sendPlanChangeNotification(
          entityId,
          contact.email,
          previousTier,
          updates.tier
        );
      }
    }

    return this.dataService.toSummary(subscription);
  }

  /**
   * Cancel a subscription either immediately or at the billing period end.
   * Supports both brand and manufacturer subscriptions.
   */
  async cancelSubscription(
    entityId: string,
    cancelImmediately = false,
    reason?: string,
    planType?: 'brand' | 'manufacturer'
  ): Promise<{ canceledAt: Date; effectiveDate: Date; refund?: number }> {
    // Determine plan type if not provided
    if (!planType) {
      const byBusiness = await this.dataService.findByBusiness(entityId);
      if (byBusiness) {
        planType = 'brand';
      } else {
        const byManufacturer = await this.dataService.findByManufacturer(entityId);
        if (byManufacturer) {
          planType = 'manufacturer';
        } else {
          throw new SubscriptionError('Subscription not found', 404);
        }
      }
    }

    const subscription = await this.dataService.requireByEntity(entityId, planType);
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
        entityId,
        { immediate: cancelImmediately }
      );
    }

    await outboundNotificationService.sendCancellationNotification(
      entityId,
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


