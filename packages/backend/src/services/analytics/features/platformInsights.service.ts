import type {
  BusinessAnalyticsSnapshot,
  DashboardAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  PlatformVotingAnalytics,
  ProductAnalyticsSnapshot
} from '../utils/types';

/**
 * Generates narrative insights based on aggregated analytics snapshots.
 */
export class PlatformInsightsService {
  /**
   * Build a list of insights for surfacing on dashboards.
   */
  generateInsights(snapshot: DashboardAnalyticsSnapshot): string[] {
    const insights: string[] = [];

    insights.push(...this.buildVotingInsights(snapshot.votingAnalytics));
    insights.push(...this.buildProductInsights(snapshot.productAnalytics));
    insights.push(...this.buildBusinessInsights(snapshot.businessAnalytics));
    insights.push(...this.buildManufacturerInsights(snapshot.manufacturerAnalytics));

    return insights.slice(0, 10);
  }

  private buildVotingInsights(voting: PlatformVotingAnalytics): string[] {
    const messages: string[] = [];

    if (voting.totalVotes === 0) {
      messages.push('No voting activity detected in the selected period. Consider launching new proposals.');
    } else if (voting.avgVotesPerDay > 100) {
      messages.push('Voting engagement is exceptionally strong. Maintain momentum with timely proposal updates.');
    }

    if (voting.verifiedVotes < voting.totalVotes * 0.5) {
      messages.push('Less than half of votes are verified. Encourage voters to complete verification for higher trust.');
    }

    if (voting.topProducts.length > 0) {
      const leader = voting.topProducts[0];
      messages.push(`${leader.productTitle} is leading in votes with ${leader.voteCount} total votes.`);
    }

    return messages;
  }

  private buildProductInsights(products: ProductAnalyticsSnapshot): string[] {
    const messages: string[] = [];

    if (products.totalProducts === 0) {
      messages.push('No products available. Add products to start tracking performance metrics.');
      return messages;
    }

    if (products.avgVotesPerProduct > 10) {
      messages.push('Products are receiving healthy engagement from voters. Highlight top performers in marketing campaigns.');
    } else if (products.avgVotesPerProduct < 2) {
      messages.push('Average votes per product are low. Consider campaigns to boost customer interaction.');
    }

    if (products.mediaUploadStats.withMedia < products.mediaUploadStats.withoutMedia) {
      messages.push('More than half of products lack media assets. Adding imagery could improve engagement.');
    }

    if (products.topPerformingProducts.length > 0) {
      const standout = products.topPerformingProducts[0];
      messages.push(`${standout.title} is the top performing product with an engagement score of ${standout.engagementScore}.`);
    }

    return messages;
  }

  private buildBusinessInsights(business: BusinessAnalyticsSnapshot): string[] {
    const messages: string[] = [];

    if (business.verificationRate < 0.5) {
      messages.push('Less than half of businesses are verified. Encourage verification to build customer trust.');
    }

    if (business.recentSignups > (business.totalBusinesses * 0.05)) {
      messages.push('Business sign ups are trending upward this period. Ensure onboarding workflows scale accordingly.');
    }

    if (Object.keys(business.plansBreakdown).length === 1) {
      messages.push('All businesses are on a single plan tier. Consider promoting higher tiers with targeted messaging.');
    }

    return messages;
  }

  private buildManufacturerInsights(manufacturers: ManufacturerAnalyticsSnapshot): string[] {
    const messages: string[] = [];

    if (manufacturers.totalManufacturers === 0) {
      messages.push('No manufacturers are onboarded yet. Focus on manufacturer acquisition initiatives.');
      return messages;
    }

    if (manufacturers.avgProfileScore > 80) {
      messages.push('Manufacturers maintain high profile completeness, indicating strong engagement.');
    } else if (manufacturers.avgProfileScore < 50) {
      messages.push('Average manufacturer profile completeness is low. Offer guidance to improve profiles.');
    }

    const primaryLocation = Object.entries(manufacturers.locationStats).sort(([, a], [, b]) => b - a)[0];
    if (primaryLocation) {
      messages.push(`Manufacturers are primarily based in ${primaryLocation[0]}. Consider expanding marketing in nearby regions.`);
    }

    return messages;
  }
}

export const platformInsightsService = new PlatformInsightsService();
