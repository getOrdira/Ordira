// src/services/business/subscription.service.ts
import { Subscription, ISubscription } from '../../models/subscription.model';
import { VotingRecord } from '../../models/votingRecord.model';
import { NftCertificate } from '../../models/nftCertificate.model';
import { BillingService } from '../external/billing.service';
import { NotificationService } from './notification.service';
import { Business } from '../../models/business.model';
import { logger } from '../../utils/logger'; 

export interface SubscriptionSummary {
  id: string;
  businessId: string;
  tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  limits: {
    votes: number;
    nfts: number;
    api: number;
    storage: number;
  };
  usage: {
    votes: number;
    nfts: number;
    api: number;
    storage: number;
  };
  usagePercentages: {
    votes: number;
    nfts: number;
    api: number;
    storage: number;
  };
  features: any;
  billing: {
    nextBillingDate: Date;
    billingCycle: string;
    nextPaymentAmount?: number;
    isTrialPeriod: boolean;
    trialEndsAt?: Date;
  };
  overage: {
    cost: number;
    allowed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimitsCheck {
  allowed: boolean;
  message?: string;
  overage?: number;
  cost?: number;
  invoiceId?: string; // Add this field
  chargeId?: string;  // Add this field (optional)
  remaining?: number;
  resetDate?: Date;
  planLimit?: number;
  currentUsage?: number;
}

export interface CreateSubscriptionData {
  businessId: string;
  tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
  billingCycle?: 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  isTrialPeriod?: boolean;
  trialDays?: number;
}

export interface UpdateSubscriptionData {
  tier?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  billingCycle?: 'monthly' | 'yearly';
  cancelAtPeriodEnd?: boolean;
}

export interface UsageLimitsCheck {
  allowed: boolean;
  overage?: number;
  cost?: number;
  message?: string;
}

class SubscriptionError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'SubscriptionError';
    this.statusCode = statusCode;
  }
}

export class SubscriptionService {
  private billingService = new BillingService();
  private notificationService = new NotificationService();

  /**
   * Get subscription for a business
   */
  async getSubscription(businessId: string): Promise<SubscriptionSummary> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    return await this.mapToSummary(subscription);
  }

  /**
   * Create a new subscription
   */
  async createSubscription(data: CreateSubscriptionData): Promise<SubscriptionSummary> {
    // Check if subscription already exists
    const existing = await Subscription.findByBusiness(data.businessId);
    if (existing) {
      throw new SubscriptionError('Subscription already exists for this business', 409);
    }

    // Set trial end date if trial period
    let trialEndsAt: Date | undefined;
    if (data.isTrialPeriod && data.trialDays) {
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + data.trialDays);
    }

    // Set next billing date
    const nextBillingDate = new Date();
    if (data.billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const subscription = await Subscription.create({
      business: data.businessId,
      tier: data.tier,
      billingCycle: data.billingCycle || 'monthly',
      stripeSubscriptionId: data.stripeSubscriptionId,
      isTrialPeriod: data.isTrialPeriod || false,
      trialEndsAt,
      nextBillingDate,
      status: 'active'
    });

    // Send welcome notification
    await this.notificationService.sendSubscriptionWelcome(data.businessId, subscription.tier);

    return await this.mapToSummary(subscription);
  }

 /**
 * Update an existing subscription
 */
async updateSubscription(
  businessId: string, 
  data: UpdateSubscriptionData
): Promise<SubscriptionSummary> {
  const subscription = await Subscription.findByBusiness(businessId);
  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 404);
  }

  // Handle tier changes with validation
  if (data.tier && data.tier !== subscription.tier) {
    const validation = await this.validateTierChange(subscription, data.tier);
    if (!validation.allowed) {
      throw new SubscriptionError(
        `Tier change not allowed: ${validation.reasons?.join(', ')}`, 
        400
      );
    }
  }

  // Store old tier for notification
  const oldTier = subscription.tier;

  // Update subscription
  Object.assign(subscription, data);
  await subscription.save();

  // Handle billing integration updates
  if (data.tier || data.billingCycle) {
    await this.billingService.changePlan(businessId, subscription.tier, {
      billingCycle: subscription.billingCycle
    });
  }

  // Send tier change notification
  if (data.tier) {
    const business = await Business.findById(businessId);
    if (business?.email) {
      await this.notificationService.sendPlanChangeNotification(
        business.email,
        oldTier,
        data.tier
      );
    }
  }

  return await this.mapToSummary(subscription);
}

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    businessId: string, 
    cancelImmediately: boolean = false,
    reason?: string
  ): Promise<{ canceledAt: Date; effectiveDate: Date; refund?: number }> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    if (subscription.status === 'canceled') {
      throw new SubscriptionError('Subscription is already canceled', 400);
    }

    let effectiveDate: Date;
    let refund: number | undefined;

    if (cancelImmediately) {
      effectiveDate = new Date();
      subscription.status = 'canceled';
      
      // Calculate prorated refund
      refund = await this.calculateProratedRefund(subscription);
    } else {
      effectiveDate = subscription.nextBillingDate;
      subscription.cancelAtPeriodEnd = true;
    }

    // Add cancellation to billing history
    subscription.billingHistory.push({
      date: new Date(),
      amount: refund || 0,
      type: 'subscription',
      description: `Subscription canceled: ${reason || 'No reason provided'}`,
      status: refund ? 'pending' : 'paid'
    });

    await subscription.save();

    // Handle billing service cancellation
    if (subscription.stripeSubscriptionId) {
      await this.billingService.cancelSubscription(
        subscription.stripeSubscriptionId, 
        cancelImmediately
      );
    }

    // Send cancellation notification
    await this.notificationService.sendCancellationNotification(
      businessId, 
      effectiveDate, 
      refund
    );

    return {
      canceledAt: new Date(),
      effectiveDate,
      refund
    };
  }

 /**
 * Check voting limits before allowing votes
 */
async checkVotingLimits(businessId: string, votesToAdd: number = 1): Promise<UsageLimitsCheck> {
  const subscription = await Subscription.findByBusiness(businessId);
  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 404);
  }

  if (subscription.status !== 'active') {
    return {
      allowed: false,
      message: `Subscription is ${subscription.status}. Please activate your subscription to continue voting.`
    };
  }

  const limitCheck = await subscription.checkVoteLimit(votesToAdd);
  
  if (!limitCheck.allowed && limitCheck.overage) {
    const overageCost = limitCheck.overage * subscription.surchargePerVote;
    
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly vote limit of ${subscription.voteLimit} would be exceeded by ${limitCheck.overage} votes. Upgrade your plan for more voting capacity.`
      };
    }

    // Check if overage billing is enabled for this business
    const overageBillingStatus = await this.billingService.isOverageBillingEnabled(businessId);
    if (!overageBillingStatus.enabled) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Overage billing not available: ${overageBillingStatus.reason}`
      };
    }

    // Charge overage if allowed
    const chargeResult = await this.billingService.chargeOverage(
      businessId,
      overageCost,
      `Vote overage: ${limitCheck.overage} votes`
    );

    if (chargeResult.success) {
      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        invoiceId: chargeResult.invoiceId,
        message: `Overage charge of $${(overageCost / 100).toFixed(2)} applied for ${limitCheck.overage} additional votes.`
      };
    } else {
      // If charging failed, still track it for later billing
      subscription.billingHistory.push({
        date: new Date(),
        amount: overageCost,
        type: 'overage',
        description: `Vote overage: ${limitCheck.overage} votes`,
        status: 'pending'
      });
      await subscription.save();

      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        message: `Overage of ${limitCheck.overage} votes approved. Billing will be processed separately.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Check NFT minting limits before allowing mints
 */
async checkNftLimits(businessId: string, nftsToMint: number = 1): Promise<UsageLimitsCheck> {
  const subscription = await Subscription.findByBusiness(businessId);
  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 404);
  }

  if (subscription.status !== 'active') {
    return {
      allowed: false,
      message: `Subscription is ${subscription.status}. Please activate your subscription to mint NFTs.`
    };
  }

  const limitCheck = await subscription.checkNftLimit(nftsToMint);
  
  if (!limitCheck.allowed && limitCheck.overage) {
    const overageCost = limitCheck.overage * subscription.surchargePerNft;
    
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly NFT limit of ${subscription.nftLimit} would be exceeded by ${limitCheck.overage} certificates. Upgrade your plan for more capacity.`
      };
    }

    // Check if overage billing is enabled
    const overageBillingStatus = await this.billingService.isOverageBillingEnabled(businessId);
    if (!overageBillingStatus.enabled) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Overage billing not available: ${overageBillingStatus.reason}`
      };
    }

    // Charge overage if allowed
    const chargeResult = await this.billingService.chargeOverage(
      businessId,
      overageCost,
      `NFT overage: ${limitCheck.overage} certificates`
    );

    if (chargeResult.success) {
      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        invoiceId: chargeResult.invoiceId,
        message: `Overage charge of $${(overageCost / 100).toFixed(2)} applied for ${limitCheck.overage} additional NFT certificates.`
      };
    } else {
      // Track for later billing
      subscription.billingHistory.push({
        date: new Date(),
        amount: overageCost,
        type: 'overage',
        description: `NFT overage: ${limitCheck.overage} certificates`,
        status: 'pending'
      });
      await subscription.save();

      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        message: `Overage of ${limitCheck.overage} certificates approved. Billing will be processed separately.`
      };
    }
  }

  return { allowed: true };
}

/**
 * Check API call limits
 */
async checkApiLimits(businessId: string, callsToAdd: number = 1): Promise<UsageLimitsCheck> {
  const subscription = await Subscription.findByBusiness(businessId);
  if (!subscription) {
    throw new SubscriptionError('Subscription not found', 404);
  }

  if (subscription.status !== 'active') {
    return {
      allowed: false,
      message: 'Subscription is inactive. API access denied.'
    };
  }

  const limitCheck = await subscription.checkApiLimit(callsToAdd);
  
  if (!limitCheck.allowed && limitCheck.overage) {
    const overageCost = limitCheck.overage * subscription.surchargePerApiCall;
    
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly API limit of ${subscription.apiLimit} would be exceeded.`
      };
    }

    // Check if overage billing is enabled
    const overageBillingStatus = await this.billingService.isOverageBillingEnabled(businessId);
    if (!overageBillingStatus.enabled) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `API overage billing not available: ${overageBillingStatus.reason}`
      };
    }

    // Charge overage
    const chargeResult = await this.billingService.chargeOverage(
      businessId,
      overageCost,
      `API overage: ${limitCheck.overage} calls`
    );

    if (chargeResult.success) {
      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        invoiceId: chargeResult.invoiceId,
        message: `API overage charge of $${(overageCost / 100).toFixed(2)} applied.`
      };
    } else {
      // Track for later billing
      subscription.billingHistory.push({
        date: new Date(),
        amount: overageCost,
        type: 'overage',
        description: `API overage: ${limitCheck.overage} calls`,
        status: 'pending'
      });
      await subscription.save();

      return {
        allowed: true,
        overage: limitCheck.overage,
        cost: overageCost,
        message: `API overage approved. Billing will be processed separately.`
      };
    }
  }

  return { allowed: true };
}

  /**
   * Record vote usage
   */
  async recordVoteUsage(businessId: string, voteCount: number = 1): Promise<void> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    await subscription.incrementVoteUsage(voteCount);
  }

  /**
   * Record NFT usage
   */
  async recordNftUsage(businessId: string, nftCount: number = 1): Promise<void> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    await subscription.incrementNftUsage(nftCount);
  }

  /**
   * Record API usage
   */
  async recordApiUsage(businessId: string, callCount: number = 1): Promise<void> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    await subscription.incrementApiUsage(callCount);
  }

  /**
   * Get voting limits and usage
   */
  async getVotingLimits(businessId: string): Promise<{
    voteLimit: number;
    usedThisMonth: number;
    remainingVotes: number | 'unlimited';
    percentage: number;
    allowOverage: boolean;
  }> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    const remaining = subscription.voteLimit === -1 
      ? 'unlimited' 
      : Math.max(subscription.voteLimit - subscription.currentVoteUsage, 0);

    const percentage = subscription.voteLimit === -1 
      ? 0 
      : (subscription.currentVoteUsage / subscription.voteLimit) * 100;

    return {
      voteLimit: subscription.voteLimit,
      usedThisMonth: subscription.currentVoteUsage,
      remainingVotes: remaining,
      percentage: Math.min(percentage, 100),
      allowOverage: subscription.allowOverage
    };
  }

  /**
   * Get NFT limits and usage
   */
  async getNftLimits(businessId: string): Promise<{
    nftLimit: number;
    usedThisMonth: number;
    remainingCertificates: number | 'unlimited';
    percentage: number;
    allowOverage: boolean;
  }> {
    const subscription = await Subscription.findByBusiness(businessId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    const remaining = subscription.nftLimit === -1 
      ? 'unlimited' 
      : Math.max(subscription.nftLimit - subscription.currentNftUsage, 0);

    const percentage = subscription.nftLimit === -1 
      ? 0 
      : (subscription.currentNftUsage / subscription.nftLimit) * 100;

    return {
      nftLimit: subscription.nftLimit,
      usedThisMonth: subscription.currentNftUsage,
      remainingCertificates: remaining,
      percentage: Math.min(percentage, 100),
      allowOverage: subscription.allowOverage
    };
  }

  /**
   * Get comprehensive subscription analytics
   */
  async getSubscriptionAnalytics(businessId: string): Promise<{
    overview: SubscriptionSummary;
    trends: any;
    projections: any;
    recommendations: string[];
  }> {
    const subscription = await this.getSubscription(businessId);
    
    // Calculate usage trends from history
    const trends = this.calculateUsageTrends(await Subscription.findByBusiness(businessId));
    
    // Project next month usage
    const projections = this.calculateUsageProjections(subscription, trends);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(subscription, projections);

    return {
      overview: subscription,
      trends,
      projections,
      recommendations
    };
  }

  /**
   * Reset monthly usage (called by cron job)
   */
  async resetMonthlyUsage(businessId?: string): Promise<{ reset: number; errors: string[] }> {
    const errors: string[] = [];
    let reset = 0;

    try {
      if (businessId) {
        // Reset specific business
        const subscription = await Subscription.findByBusiness(businessId);
        if (subscription) {
          await subscription.resetUsage();
          reset = 1;
        }
      } else {
        // Reset all subscriptions that need it
        const subscriptions = await Subscription.find({
          lastResetDate: { 
            $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
          }
        });

        for (const subscription of subscriptions) {
          try {
            await subscription.resetUsage();
            reset++;
          } catch (error: any) {
            errors.push(`Failed to reset ${subscription.business}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      errors.push(`Reset operation failed: ${error.message}`);
    }

    return { reset, errors };
  }

  /**
   * Validate tier change
   */
  private async validateTierChange(
    subscription: ISubscription, 
    newTier: string
  ): Promise<{ allowed: boolean; reasons?: string[] }> {
    const reasons: string[] = [];

    // Check if it's a downgrade
    const tierOrder = ['foundation', 'growth', 'premium', 'enterprise'];
    const currentIndex = tierOrder.indexOf(subscription.tier);
    const newIndex = tierOrder.indexOf(newTier);
    
    if (newIndex < currentIndex) {
      // It's a downgrade - check current usage
      const tierLimits = this.getTierLimits(newTier);
      
      if (subscription.currentVoteUsage > tierLimits.votes && tierLimits.votes !== -1) {
        reasons.push(`Current vote usage (${subscription.currentVoteUsage}) exceeds ${newTier} limit (${tierLimits.votes})`);
      }
      
      if (subscription.currentNftUsage > tierLimits.nfts && tierLimits.nfts !== -1) {
        reasons.push(`Current NFT usage (${subscription.currentNftUsage}) exceeds ${newTier} limit (${tierLimits.nfts})`);
      }
      
      if (subscription.currentApiUsage > tierLimits.api && tierLimits.api !== -1) {
        reasons.push(`Current API usage (${subscription.currentApiUsage}) exceeds ${newTier} limit (${tierLimits.api})`);
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons: reasons.length > 0 ? reasons : undefined
    };
  }

  /**
   * Calculate prorated refund for immediate cancellation
   */
  private async calculateProratedRefund(subscription: ISubscription): Promise<number> {
    if (!subscription.lastPaymentDate || !subscription.nextPaymentAmount) {
      return 0;
    }

    const now = new Date();
    const lastPayment = subscription.lastPaymentDate;
    const nextBilling = subscription.nextBillingDate;
    
    const totalPeriod = nextBilling.getTime() - lastPayment.getTime();
    const remainingPeriod = nextBilling.getTime() - now.getTime();
    
    if (remainingPeriod <= 0) return 0;
    
    const refundPercentage = remainingPeriod / totalPeriod;
    return Math.round(subscription.nextPaymentAmount * refundPercentage);
  }

  /**
   * Get tier limits configuration
   */
  private getTierLimits(tier: string): { votes: number; nfts: number; api: number; storage: number } {
    const limits = {
      foundation: { votes: 100, nfts: 50, api: 1000, storage: 1 },
      growth: { votes: 500, nfts: 150, api: 10000, storage: 5 },
      premium: { votes: 2000, nfts: 500, api: 100000, storage: 25 },
      enterprise: { votes: -1, nfts: -1, api: -1, storage: 100 }
    };
    
    return limits[tier as keyof typeof limits] || limits.foundation;
  }

  /**
   * Calculate usage trends from historical data
   */
  private calculateUsageTrends(subscription: ISubscription | null): any {
    if (!subscription || !subscription.usageHistory.length) {
      return { votes: 0, nfts: 0, api: 0, storage: 0 };
    }

    const history = subscription.usageHistory.slice(-3); // Last 3 months
    if (history.length < 2) return { votes: 0, nfts: 0, api: 0, storage: 0 };

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      votes: ((latest.votes - previous.votes) / previous.votes) * 100,
      nfts: ((latest.nfts - previous.nfts) / previous.nfts) * 100,
      api: ((latest.apiCalls - previous.apiCalls) / previous.apiCalls) * 100,
      storage: ((latest.storage - previous.storage) / previous.storage) * 100
    };
  }

  /**
   * Calculate usage projections for next month
   */
  private calculateUsageProjections(subscription: SubscriptionSummary, trends: any): any {
    return {
      votes: Math.round(subscription.usage.votes * (1 + trends.votes / 100)),
      nfts: Math.round(subscription.usage.nfts * (1 + trends.nfts / 100)),
      api: Math.round(subscription.usage.api * (1 + trends.api / 100)),
      storage: Math.round(subscription.usage.storage * (1 + trends.storage / 100))
    };
  }

  /**
   * Generate recommendations based on usage patterns
   */
  private generateRecommendations(subscription: SubscriptionSummary, projections: any): string[] {
    const recommendations: string[] = [];

    // Check for approaching limits
    if (subscription.usagePercentages.votes > 80) {
      recommendations.push('Vote usage is high - consider upgrading for more capacity');
    }

    if (subscription.usagePercentages.nfts > 80) {
      recommendations.push('NFT certificate usage approaching limit - upgrade recommended');
    }

    if (subscription.usagePercentages.api > 80) {
      recommendations.push('API usage is high - consider higher tier for increased limits');
    }

    // Check projected overages
    if (projections.votes > subscription.limits.votes && subscription.limits.votes !== -1) {
      recommendations.push('Projected to exceed vote limits next month');
    }

    if (projections.nfts > subscription.limits.nfts && subscription.limits.nfts !== -1) {
      recommendations.push('Projected to exceed NFT limits next month');
    }

    // Tier-specific recommendations
    if (subscription.tier === 'foundation' && subscription.usagePercentages.votes > 50) {
      recommendations.push('Consider upgrading to Growth tier for better voting capacity');
    }

    if (subscription.tier === 'growth' && Object.values(subscription.usagePercentages).some(p => p > 70)) {
      recommendations.push('Premium tier would provide better capacity for your usage patterns');
    }

    return recommendations;
  }

 /**
 * Map subscription to summary format
 */
private async mapToSummary(subscription: ISubscription): Promise<SubscriptionSummary> {
  return {
    id: subscription._id.toString(),
    businessId: subscription.business.toString(),
    tier: subscription.tier,
    status: subscription.status,
    limits: {
      votes: subscription.voteLimit,
      nfts: subscription.nftLimit,
      api: subscription.apiLimit,
      storage: subscription.storageLimit
    },
    usage: {
      votes: subscription.currentVoteUsage,
      nfts: subscription.currentNftUsage,
      api: subscription.currentApiUsage,
      storage: subscription.currentStorageUsage
    },
    usagePercentages: subscription.getUsagePercentages(),
    features: subscription.features,
    billing: {
      nextBillingDate: subscription.nextBillingDate,
      billingCycle: subscription.billingCycle,
      nextPaymentAmount: subscription.nextPaymentAmount,
      isTrialPeriod: subscription.isTrialPeriod,
      trialEndsAt: subscription.trialEndsAt
    },
    overage: {
      cost: await subscription.calculateOverageCost(),
      allowed: subscription.allowOverage
    },
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
}
}