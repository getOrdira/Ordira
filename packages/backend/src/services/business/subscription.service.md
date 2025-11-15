// src/services/business/subscription.service.ts
import {
  subscriptionServices,
  SubscriptionSummary,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  UsageLimitsCheck,
  SubscriptionInsights,
  TierChangeAnalysis,
  TierComparison
} from '../subscriptions';
import { SubscriptionError } from '../subscriptions';
import { Subscription } from '../../models/subscription.model';

export class SubscriptionService {
  private readonly dataService = subscriptionServices.data;
  private readonly lifecycleService = subscriptionServices.lifecycle;
  private readonly usageLimitsService = subscriptionServices.usageLimits;
  private readonly analyticsService = subscriptionServices.analytics;
  private readonly tierManagementService = subscriptionServices.tierManagement;
  private readonly validationService = subscriptionServices.validation;

  /**
   * Retrieve the active subscription summary for a business.
   */
  async getSubscription(businessId: string): Promise<SubscriptionSummary> {
    return this.dataService.getSummaryForBusiness(businessId);
  }

  /**
   * Create a new subscription leveraging the modular lifecycle workflow.
   */
  async createSubscription(data: CreateSubscriptionInput): Promise<SubscriptionSummary> {
    return this.lifecycleService.createSubscription(data);
  }

  /**
   * Update subscription attributes (tier, billing cycle, status).
   */
  async updateSubscription(
    businessId: string,
    data: UpdateSubscriptionInput
  ): Promise<SubscriptionSummary> {
    return this.lifecycleService.updateSubscription(businessId, data);
  }

  /**
   * Cancel the subscription and reconcile billing.
   */
  async cancelSubscription(
    businessId: string,
    cancelImmediately = false,
    reason?: string
  ): Promise<{ canceledAt: Date; effectiveDate: Date; refund?: number }> {
    return this.lifecycleService.cancelSubscription(businessId, cancelImmediately, reason);
  }

  /**
   * Expose brand tier catalogue for UI components.
   */
  getAvailableTiersData() {
    return this.tierManagementService.getAvailableTiers();
  }

  getTierFeatures(tier: string): string[] {
    return this.tierManagementService.getTierFeatures(tier);
  }

  generateOnboardingSteps(tier: string): string[] {
    return this.tierManagementService.generateOnboardingSteps(tier);
  }

  generateTierComparison(currentTier: string): TierComparison {
    return this.tierManagementService.generateTierComparison(currentTier);
  }

  analyzeSubscriptionChanges(
    current: SubscriptionSummary,
    updatedOrChanges: SubscriptionSummary | Partial<UpdateSubscriptionInput>,
    explicitChanges?: Partial<UpdateSubscriptionInput>
  ): TierChangeAnalysis {
    const changePayload = explicitChanges ?? (updatedOrChanges as Partial<UpdateSubscriptionInput>);
    return this.tierManagementService.analyzeSubscriptionChanges(current, changePayload);
  }

  /**
   * Provide holistic subscription insights (health, risks, opportunities).
   */
  async getSubscriptionInsights(businessId: string): Promise<SubscriptionInsights> {
    return this.analyticsService.buildInsights(businessId);
  }

  async getSubscriptionAnalytics(businessId: string) {
    return this.analyticsService.getUsageAnalytics(businessId);
  }

  calculateHealthScore(subscription: SubscriptionSummary) {
    return this.analyticsService.calculateHealth(subscription);
  }

  identifyRiskFactors(subscription: SubscriptionSummary): string[] {
    return this.analyticsService.identifyRiskFactors(subscription);
  }

  findOptimizationOpportunities(subscription: SubscriptionSummary): string[] {
    return this.analyticsService.findOptimizationOpportunities(subscription);
  }

  generateImmediateActions(subscription: SubscriptionSummary): string[] {
    return this.analyticsService.generateImmediateActions(subscription);
  }

  generatePlannedActions(): string[] {
    return this.analyticsService.generatePlannedActions();
  }

  generateWinBackOffers(subscription: SubscriptionSummary, reason?: string): string[] {
    const offers: string[] = [];
    if (reason === 'cost') {
      offers.push('20% discount for next 3 months');
    }
    if (subscription.tier !== 'foundation') {
      offers.push('Temporary downgrade option');
    }
    return offers;
  }

  async getVotingLimits(businessId: string) {
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

  async getNftLimits(businessId: string) {
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

  /**
   * Prevent vote usage from exceeding plan limits.
   */
  async checkVotingLimits(businessId: string, votesToAdd = 1): Promise<UsageLimitsCheck> {
    return this.usageLimitsService.checkVotingLimits(businessId, votesToAdd);
  }

  async checkNftLimits(businessId: string, nftsToMint = 1): Promise<UsageLimitsCheck> {
    return this.usageLimitsService.checkNftLimits(businessId, nftsToMint);
  }

  async checkApiLimits(businessId: string, callsToAdd = 1): Promise<UsageLimitsCheck> {
    return this.usageLimitsService.checkApiLimits(businessId, callsToAdd);
  }

  async recordVoteUsage(businessId: string, voteCount = 1): Promise<void> {
    await this.usageLimitsService.recordVoteUsage(businessId, voteCount);
  }

  async recordNftUsage(businessId: string, nftCount = 1): Promise<void> {
    await this.usageLimitsService.recordNftUsage(businessId, nftCount);
  }

  async recordApiUsage(businessId: string, callCount = 1): Promise<void> {
    await this.usageLimitsService.recordApiUsage(businessId, callCount);
  }

  async resetMonthlyUsage(businessId?: string): Promise<{ reset: number; errors: string[] }> {
    return this.dataService.resetMonthlyUsage(businessId);
  }

  /**
   * Legacy helper retained for compatibility with existing validation flows.
   */
  async validateTierChange(subscriptionId: string, newTier: string) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new SubscriptionError('Subscription not found', 404);
    }

    return this.validationService.validateTierChange(subscription, newTier);
  }
}
