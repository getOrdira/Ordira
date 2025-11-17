import { BillingManagementService, billingManagementService } from '../features/billingManagement.service';
import { SubscriptionDataService, subscriptionDataService } from '../core/subscriptionData.service';
import { UsageLimitsCheck, SubscriptionDocument } from '../utils/types';


const formatDollars = (amount: number): string => (amount / 100).toFixed(2);

export class SubscriptionUsageLimitsService {
  constructor(
    private readonly dataService: SubscriptionDataService = subscriptionDataService,
    private readonly billingService: BillingManagementService = billingManagementService
  ) {}

  /**
   * Validate voting capacity before casting votes.
   */
  async checkVotingLimits(businessId: string, votesToAdd = 1): Promise<UsageLimitsCheck> {
    const subscription = await this.dataService.requireByBusiness(businessId);

    if (subscription.status !== 'active') {
      return {
        allowed: false,
        message: `Subscription is ${subscription.status}. Please activate your subscription to continue voting.`
      };
    }

    const limitCheck = await subscription.checkVoteLimit(votesToAdd);
    if (limitCheck.allowed || !limitCheck.overage) {
      return { allowed: true, planLimit: subscription.voteLimit, currentUsage: subscription.currentVoteUsage };
    }

    const overageCost = limitCheck.overage * subscription.surchargePerVote;
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly vote limit of ${subscription.voteLimit} would be exceeded by ${limitCheck.overage} votes. Upgrade your plan for more voting capacity.`
      };
    }

    return this.processOverageCharge({
      subscription,
      businessId,
      overageCount: limitCheck.overage,
      overageCost,
      description: `Vote overage: ${limitCheck.overage} votes`
    });
  }

  /**
   * Validate NFT minting capacity prior to issuing certificates.
   */
  async checkNftLimits(businessId: string, nftsToMint = 1): Promise<UsageLimitsCheck> {
    const subscription = await this.dataService.requireByBusiness(businessId);

    if (subscription.status !== 'active') {
      return {
        allowed: false,
        message: `Subscription is ${subscription.status}. Please activate your subscription to mint NFTs.`
      };
    }

    const limitCheck = await subscription.checkNftLimit(nftsToMint);
    if (limitCheck.allowed || !limitCheck.overage) {
      return { allowed: true, planLimit: subscription.nftLimit, currentUsage: subscription.currentNftUsage };
    }

    const overageCost = limitCheck.overage * subscription.surchargePerNft;
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly NFT limit of ${subscription.nftLimit} would be exceeded by ${limitCheck.overage} certificates. Upgrade your plan for more capacity.`
      };
    }

    return this.processOverageCharge({
      subscription,
      businessId,
      overageCount: limitCheck.overage,
      overageCost,
      description: `NFT overage: ${limitCheck.overage} certificates`
    });
  }

  /**
   * Validate API call capacity.
   */
  async checkApiLimits(businessId: string, callsToAdd = 1): Promise<UsageLimitsCheck> {
    const subscription = await this.dataService.requireByBusiness(businessId);

    if (subscription.status !== 'active') {
      return {
        allowed: false,
        message: 'Subscription is inactive. API access denied.'
      };
    }

    const limitCheck = await subscription.checkApiLimit(callsToAdd);
    if (limitCheck.allowed || !limitCheck.overage) {
      return { allowed: true, planLimit: subscription.apiLimit, currentUsage: subscription.currentApiUsage };
    }

    const overageCost = limitCheck.overage * subscription.surchargePerApiCall;
    if (!subscription.allowOverage) {
      return {
        allowed: false,
        overage: limitCheck.overage,
        message: `Monthly API limit of ${subscription.apiLimit} would be exceeded.`
      };
    }

    return this.processOverageCharge({
      subscription,
      businessId,
      overageCount: limitCheck.overage,
      overageCost,
      description: `API overage: ${limitCheck.overage} calls`
    });
  }

  /**
   * Increment vote usage counters for successful votes.
   */
  async recordVoteUsage(businessId: string, voteCount = 1): Promise<void> {
    const subscription = await this.dataService.requireByBusiness(businessId);
    await subscription.incrementVoteUsage(voteCount);
  }

  /**
   * Increment NFT usage counters for successful minting.
   */
  async recordNftUsage(businessId: string, nftCount = 1): Promise<void> {
    const subscription = await this.dataService.requireByBusiness(businessId);
    await subscription.incrementNftUsage(nftCount);
  }

  /**
   * Increment API usage counters for outbound requests.
   */
  async recordApiUsage(businessId: string, callCount = 1): Promise<void> {
    const subscription = await this.dataService.requireByBusiness(businessId);
    await subscription.incrementApiUsage(callCount);
  }

  /**
   * Get formatted voting limits summary for UI display.
   */
  async getVotingLimits(businessId: string): Promise<{
    voteLimit: number;
    usedThisMonth: number;
    remainingVotes: number | 'unlimited';
    percentage: number;
    allowOverage: boolean;
  }> {
    const subscription = await this.dataService.requireByBusiness(businessId);
    const remaining = subscription.voteLimit === -1
      ? 'unlimited'
      : Math.max(subscription.voteLimit - subscription.currentVoteUsage, 0);
    const percentage = subscription.voteLimit === -1
      ? 0
      : Math.min((subscription.currentVoteUsage / subscription.voteLimit) * 100, 100);

    return {
      voteLimit: subscription.voteLimit,
      usedThisMonth: subscription.currentVoteUsage,
      remainingVotes: remaining,
      percentage,
      allowOverage: subscription.allowOverage
    };
  }

  /**
   * Get formatted NFT limits summary for UI display.
   */
  async getNftLimits(businessId: string): Promise<{
    nftLimit: number;
    usedThisMonth: number;
    remainingCertificates: number | 'unlimited';
    percentage: number;
    allowOverage: boolean;
  }> {
    const subscription = await this.dataService.requireByBusiness(businessId);
    const remaining = subscription.nftLimit === -1
      ? 'unlimited'
      : Math.max(subscription.nftLimit - subscription.currentNftUsage, 0);
    const percentage = subscription.nftLimit === -1
      ? 0
      : Math.min((subscription.currentNftUsage / subscription.nftLimit) * 100, 100);

    return {
      nftLimit: subscription.nftLimit,
      usedThisMonth: subscription.currentNftUsage,
      remainingCertificates: remaining,
      percentage,
      allowOverage: subscription.allowOverage
    };
  }

  private async processOverageCharge({
    subscription,
    businessId,
    overageCount,
    overageCost,
    description
  }: {
    subscription: SubscriptionDocument;
    businessId: string;
    overageCount: number;
    overageCost: number;
    description: string;
  }): Promise<UsageLimitsCheck> {
    const overageBillingStatus = await this.billingService.isOverageBillingEnabled(businessId);
    if (!overageBillingStatus.enabled) {
      return {
        allowed: false,
        overage: overageCount,
        message: `Overage billing not available: ${overageBillingStatus.reason ?? 'Contact support'}`
      };
    }

    const chargeResult = await this.billingService.chargeOverage(
      businessId,
      overageCost,
      description
    );

    if (chargeResult.success) {
      return {
        allowed: true,
        overage: overageCount,
        cost: overageCost,
        invoiceId: chargeResult.invoiceId,
        message: `Overage charge of $${formatDollars(overageCost)} applied for ${overageCount} additional units.`
      };
    }

    subscription.billingHistory.push({
      date: new Date(),
      amount: overageCost,
      type: 'overage',
      description,
      status: 'pending'
    });
    await subscription.save();

    return {
      allowed: true,
      overage: overageCount,
      cost: overageCost,
      message: `Overage of ${overageCount} units approved. Billing will be processed separately.`
    };
  }
}

export const subscriptionUsageLimitsService = new SubscriptionUsageLimitsService();


