import { SubscriptionDataService, subscriptionDataService } from '../core/subscriptionData.service';
import { subscriptionTierManagementService } from './tierManagement.service';
import {SubscriptionSummary, SubscriptionHealth, SubscriptionUsageTrends, SubscriptionUsageProjections, SubscriptionInsights, SubscriptionDocument} from '../utils/types';

const toPercentageChange = (latest: number, previous: number): number => {
  if (previous <= 0) {
    return 0;
  }

  const change = ((latest - previous) / previous) * 100;
  return Number.isFinite(change) ? Math.round(change * 100) / 100 : 0;
};

export class SubscriptionAnalyticsService {
  constructor(private readonly dataService: SubscriptionDataService = subscriptionDataService) {}

  async getOverview(businessId: string): Promise<SubscriptionSummary> {
    return this.dataService.getSummaryForBusiness(businessId);
  }

  async buildInsights(businessId: string): Promise<SubscriptionInsights> {
    const overview = await this.getOverview(businessId);
    const health = this.calculateHealth(overview);
    const risks = this.identifyRiskFactors(overview);
    const optimization = this.findOptimizationOpportunities(overview);
    const immediateActions = this.generateImmediateActions(overview);
    const plannedActions = this.generatePlannedActions();
    const tierComparison = subscriptionTierManagementService.generateTierComparison(overview.tier);

    return {
      health,
      risks,
      optimization,
      immediateActions,
      plannedActions,
      tierComparison
    };
  }

  async getUsageAnalytics(businessId: string): Promise<{
    overview: SubscriptionSummary;
    trends: SubscriptionUsageTrends;
    projections: SubscriptionUsageProjections;
    recommendations: string[];
  }> {
    const overview = await this.getOverview(businessId);
    const subscription = await this.dataService.requireByBusiness(businessId);
    const trends = this.calculateUsageTrends(subscription);
    const projections = this.calculateUsageProjections(overview, trends);
    const recommendations = this.generateRecommendations(overview, projections);

    return {
      overview,
      trends,
      projections,
      recommendations
    };
  }

  calculateHealth(subscription: SubscriptionSummary): SubscriptionHealth {
    let score = 100;
    const factors: string[] = [];

    if (subscription.usagePercentages.votes > 90) {
      score -= 20;
      factors.push('Vote usage very high');
    } else if (subscription.usagePercentages.votes > 80) {
      score -= 10;
      factors.push('Vote usage high');
    }

    if (subscription.usagePercentages.nfts > 90) {
      score -= 20;
      factors.push('NFT usage very high');
    }

    if (subscription.status !== 'active') {
      score -= 30;
      factors.push(`Subscription ${subscription.status}`);
    }

    if (subscription.billing.isTrialPeriod && subscription.billing.trialEndsAt) {
      const daysLeft = Math.ceil((subscription.billing.trialEndsAt.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 3) {
        score -= 15;
        factors.push('Trial ending soon');
      }
    }

    const boundedScore = Math.max(0, score);
    const status: SubscriptionHealth['status'] = boundedScore >= 80 ? 'healthy' : boundedScore >= 60 ? 'warning' : 'critical';

    return {
      score: boundedScore,
      status,
      factors
    };
  }

  identifyRiskFactors(subscription: SubscriptionSummary): string[] {
    const risks: string[] = [];

    if (subscription.usagePercentages.votes > 95) {
      risks.push('Vote limit nearly exceeded');
    }

    if (subscription.billing.isTrialPeriod && subscription.billing.trialEndsAt) {
      const daysLeft = Math.ceil((subscription.billing.trialEndsAt.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 7) {
        risks.push('Trial expiring within 7 days');
      }
    }

    if (subscription.status === 'past_due') {
      risks.push('Payment overdue');
    }

    return risks;
  }

  findOptimizationOpportunities(subscription: SubscriptionSummary): string[] {
    const ops: string[] = [];

    if (subscription.tier !== 'foundation' && subscription.usagePercentages.votes < 30) {
      ops.push('Consider downgrading to save costs');
    }

    if (subscription.usagePercentages.votes > 80 && subscription.tier !== 'enterprise') {
      ops.push('Upgrade to higher tier for better limits');
    }

    return ops;
  }

  generateImmediateActions(subscription: SubscriptionSummary): string[] {
    const actions: string[] = [];

    if (subscription.billing.isTrialPeriod && subscription.billing.trialEndsAt) {
      const daysLeft = Math.ceil((subscription.billing.trialEndsAt.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 3) {
        actions.push('Add billing information to continue service');
      }
    }

    if (subscription.usagePercentages.votes > 90) {
      actions.push('Consider upgrading plan to avoid hitting limits');
    }

    return actions;
  }

  generatePlannedActions(): string[] {
    return [
      'Review monthly usage patterns',
      'Evaluate tier optimization opportunities',
      'Plan for growth and scaling needs'
    ];
  }

  calculateUsageTrends(subscription: SubscriptionDocument): SubscriptionUsageTrends {
    if (!subscription.usageHistory.length || subscription.usageHistory.length < 2) {
      return { votes: 0, nfts: 0, api: 0, storage: 0 };
    }

    const history = subscription.usageHistory.slice(-3);
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      votes: toPercentageChange(latest.votes, previous.votes),
      nfts: toPercentageChange(latest.nfts, previous.nfts),
      api: toPercentageChange(latest.apiCalls, previous.apiCalls),
      storage: toPercentageChange(latest.storage, previous.storage)
    };
  }

  calculateUsageProjections(
    subscription: SubscriptionSummary,
    trends: SubscriptionUsageTrends
  ): SubscriptionUsageProjections {
    return {
      votes: Math.round(subscription.usage.votes * (1 + trends.votes / 100)),
      nfts: Math.round(subscription.usage.nfts * (1 + trends.nfts / 100)),
      api: Math.round(subscription.usage.api * (1 + trends.api / 100)),
      storage: Math.round(subscription.usage.storage * (1 + trends.storage / 100))
    };
  }

  generateRecommendations(
    subscription: SubscriptionSummary,
    projections: SubscriptionUsageProjections
  ): string[] {
    const recommendations: string[] = [];

    if (subscription.usagePercentages.votes > 80) {
      recommendations.push('Vote usage is high - consider upgrading for more capacity');
    }

    if (subscription.usagePercentages.nfts > 80) {
      recommendations.push('NFT certificate usage approaching limit - upgrade recommended');
    }

    if (subscription.usagePercentages.api > 80) {
      recommendations.push('API usage is high - consider higher tier for increased limits');
    }

    if (subscription.limits.votes !== -1 && projections.votes > subscription.limits.votes) {
      recommendations.push('Projected to exceed vote limits next month');
    }

    if (subscription.limits.nfts !== -1 && projections.nfts > subscription.limits.nfts) {
      recommendations.push('Projected to exceed NFT limits next month');
    }

    if (subscription.tier === 'foundation' && subscription.usagePercentages.votes > 50) {
      recommendations.push('Consider upgrading to Growth tier for better voting capacity');
    }

    if (
      subscription.tier === 'growth' &&
      Object.values(subscription.usagePercentages).some((percentage) => percentage > 70)
    ) {
      recommendations.push('Premium tier would provide better capacity for your usage patterns');
    }

    return recommendations;
  }

  /**
   * Generate win-back offers for subscription cancellation scenarios.
   */
  generateWinBackOffers(subscription: SubscriptionSummary, reason?: string): string[] {
    const offers: string[] = [];

    if (reason === 'cost') {
      offers.push('20% discount for next 3 months');
      offers.push('Switch to annual billing for 2 months free');
    }

    if (reason === 'features') {
      offers.push('Free trial of next tier for 30 days');
      offers.push('Custom feature consultation with product team');
    }

    if (subscription.tier !== 'foundation') {
      offers.push('Temporary downgrade option with data retention');
      offers.push('Pause subscription for up to 60 days');
    }

    if (subscription.tier === 'enterprise' || subscription.tier === 'premium') {
      offers.push('Dedicated account manager assistance');
      offers.push('Custom pricing based on your usage patterns');
    }

    // Generic offers if no reason provided or no specific offers matched
    if (offers.length === 0) {
      offers.push('15% discount for next billing cycle');
      offers.push('Extended support to help maximize value');
    }

    return offers;
  }
}

export const subscriptionAnalyticsService = new SubscriptionAnalyticsService();

