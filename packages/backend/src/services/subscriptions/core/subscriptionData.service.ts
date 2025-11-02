import { Subscription, ISubscription } from '../../../models/subscription/subscription.model';
import { Business } from '../../../models/deprecated/business.model';
import {
  SubscriptionSummary,
  SubscriptionUsageMetrics,
  SubscriptionDocument,
  SubscriptionPlanType,
  SubscriptionFeatureFlags
} from '../utils/types';
import {
  getBrandAllowOverage,
  getBrandFeatureFlags,
  getBrandUsageLimits,
  isBrandPlan,
  isManufacturerPlan
} from '../utils/planCatalog';
import { SubscriptionError } from '../utils/errors';

const toUsageMetrics = (subscription: SubscriptionDocument): SubscriptionUsageMetrics => ({
  votes: subscription.currentVoteUsage,
  nfts: subscription.currentNftUsage,
  api: subscription.currentApiUsage,
  storage: subscription.currentStorageUsage
});

export class SubscriptionDataService {
  /**
   * Find a subscription by business identifier.
   */
  async findByBusiness(businessId: string): Promise<ISubscription | null> {
    return Subscription.findByBusiness(businessId);
  }

  /**
   * Retrieve a subscription or throw if it does not exist.
   */
    async requireByBusiness(businessId: string): Promise<ISubscription> {
    const subscription = await this.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }
    return subscription;
  }

  /**
   * Resolve basic business contact metadata to power notifications.
   */
  async getBusinessContact(
    businessId: string
  ): Promise<{ id: string; email?: string } | null> {
    const business = await Business.findById(businessId).select('_id email');
    if (!business) {
      return null;
    }

    return {
      id: business._id.toString(),
      email: business.email ?? undefined
    };
  }

  /**
   * Convert a subscription document into a typed summary enriched with plan data.
   */
  async toSummary(subscription: SubscriptionDocument): Promise<SubscriptionSummary> {
    const tier = subscription.tier;
    let planType: SubscriptionPlanType = 'brand';
    let limits: SubscriptionUsageMetrics = {
      votes: subscription.voteLimit,
      nfts: subscription.nftLimit,
      api: subscription.apiLimit,
      storage: subscription.storageLimit
    };
    let features: SubscriptionFeatureFlags = subscription.features as SubscriptionFeatureFlags;
    let allowOverage = subscription.allowOverage;

    if (isBrandPlan(tier)) {
      planType = 'brand';
      limits = getBrandUsageLimits(tier);
      const planFeatures = getBrandFeatureFlags(tier);
      features = {
        ...planFeatures,
        ...subscription.features
      } as SubscriptionFeatureFlags;
      allowOverage = getBrandAllowOverage(tier);
    } else if (isManufacturerPlan(tier)) {
      planType = 'manufacturer';
    }

    const usage = toUsageMetrics(subscription);
    const usagePercentages = subscription.getUsagePercentages();

    return {
      id: subscription._id.toString(),
      businessId: subscription.business.toString(),
      planType,
      tier,
      status: subscription.status,
      limits,
      usage,
      usagePercentages,
      features,
      billing: {
        nextBillingDate: subscription.nextBillingDate,
        billingCycle: subscription.billingCycle,
        nextPaymentAmount: subscription.nextPaymentAmount,
        isTrialPeriod: subscription.isTrialPeriod,
        trialEndsAt: subscription.trialEndsAt ?? undefined
      },
      overage: {
        cost: await subscription.calculateOverageCost(),
        allowed: allowOverage,
        pendingCharges: subscription.billingHistory
          .filter(entry => entry.status === 'pending')
          .reduce((total, entry) => total + entry.amount, 0)
      },
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt
    };
  }

  /**
   * Convenience helper to fetch and summarise a subscription in one call.
   */
  async getSummaryForBusiness(businessId: string): Promise<SubscriptionSummary> {
    const subscription = await this.requireByBusiness(businessId);
    return this.toSummary(subscription);
  }

  /**
   * Reset usage counters for the supplied subscription documents.
   */
  async resetUsageForSubscriptions(
    subscriptions: ISubscription[]
  ): Promise<{ reset: number; errors: string[] }> {
    const errors: string[] = [];
    let reset = 0;

    for (const subscription of subscriptions) {
      try {
        await subscription.resetUsage();
        reset += 1;
      } catch (error) {
        errors.push(
          `Failed to reset ${subscription.business}: ${(error as Error).message}`
        );
      }
    }

    return { reset, errors };
  }

  /**
   * Reset usage for a specific business or for all subscriptions requiring a monthly reset.
   */
  async resetMonthlyUsage(businessId?: string): Promise<{ reset: number; errors: string[] }> {
    if (businessId) {
      const subscription = await this.findByBusiness(businessId);
      if (!subscription) {
        return {
          reset: 0,
          errors: [`Subscription not found for business ${businessId}`]
        };
      }
      await subscription.resetUsage();
      return { reset: 1, errors: [] };
    }

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const subscriptions = await Subscription.find({
      lastResetDate: {
        $lte: cutoff
      }
    });

    return this.resetUsageForSubscriptions(subscriptions);
  }
}

export const subscriptionDataService = new SubscriptionDataService();

