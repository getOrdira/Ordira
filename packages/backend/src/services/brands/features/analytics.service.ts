// src/services/brands/features/analytics.service.ts
import { Business } from '../../../models/business.model';
import { BrandSettings } from '../../../models/brandSettings.model';
import { logger } from '../../../utils/logger';

export interface AccountAnalytics {
  apiUsage: any;
  certificateUsage: any;
  votingActivity: any;
  loginActivity: any;
  profileViews: any;
  engagement?: any;
  conversions?: any;
  advanced?: any;
  period: {
    start: Date;
    end: Date;
    timeframe: string;
  };
  summary: {
    totalActiveDays: number;
    mostActiveFeature: string;
    growthTrend: string;
  };
  options: {
    includeEngagement: boolean;
    includeConversions: boolean;
    includeAdvancedMetrics: boolean;
  };
}

export interface ProfilePerformance {
  completeness: number;
  score: number;
  missingFields: string[];
  recommendations: string[];
  lastUpdated: Date;
  visibility: string;
}

export interface AccountSummary {
  id: string;
  businessName: string;
  email: string;
  plan: string;
  status: string;
  verified: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  profileCompleteness: number;
  walletConnected: boolean;
  industry: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'xlsx' | 'xml';
  includeAnalytics?: boolean;
  includeHistory?: boolean;
  anonymize?: boolean;
}

export class AnalyticsService {

  /**
   * Get comprehensive account analytics
   */
  async getAccountAnalytics(
    businessId: string,
    options?: {
      timeframe?: string;
      includeEngagement?: boolean;
      includeConversions?: boolean;
      includeAdvancedMetrics?: boolean;
    }
  ): Promise<AccountAnalytics> {
    try {
      // Parse timeframe - default to 30 days
      const timeframe = options?.timeframe || '30d';
      let daysAgo = 30;

      // Parse timeframe string (30d, 7d, 90d, etc.)
      const timeframeMatch = timeframe.match(/^(\d+)([dDwWmMyY])$/);
      if (timeframeMatch) {
        const [, amount, unit] = timeframeMatch;
        const numAmount = parseInt(amount);

        switch (unit.toLowerCase()) {
          case 'd':
            daysAgo = numAmount;
            break;
          case 'w':
            daysAgo = numAmount * 7;
            break;
          case 'm':
            daysAgo = numAmount * 30;
            break;
          case 'y':
            daysAgo = numAmount * 365;
            break;
          default:
            daysAgo = 30;
        }
      }

      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const analytics: any = {
        apiUsage: await this.getApiUsage(businessId, startDate),
        certificateUsage: await this.getCertificateUsage(businessId, startDate),
        votingActivity: await this.getVotingActivity(businessId, startDate),
        loginActivity: await this.getLoginActivity(businessId, startDate),
        profileViews: await this.getProfileViews(businessId, startDate)
      };

      // Add engagement metrics if requested
      if (options?.includeEngagement) {
        analytics.engagement = await this.getEngagementMetrics(businessId, startDate);
      }

      // Add conversion metrics if requested
      if (options?.includeConversions) {
        analytics.conversions = await this.getConversionMetrics(businessId, startDate);
      }

      // Add advanced metrics if requested
      if (options?.includeAdvancedMetrics) {
        analytics.advanced = await this.getAdvancedMetrics(businessId, startDate);
      }

      return {
        ...analytics,
        period: {
          start: startDate,
          end: new Date(),
          timeframe
        },
        summary: {
          totalActiveDays: analytics.loginActivity.activeDays || 0,
          mostActiveFeature: this.getMostActiveFeature(analytics),
          growthTrend: this.calculateGrowthTrend(analytics)
        },
        options: {
          includeEngagement: options?.includeEngagement || false,
          includeConversions: options?.includeConversions || false,
          includeAdvancedMetrics: options?.includeAdvancedMetrics || false
        }
      };
    } catch (error) {
      logger.error('Error getting account analytics:', error);
      return {
        apiUsage: {},
        certificateUsage: {},
        votingActivity: {},
        loginActivity: {},
        profileViews: {},
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
          timeframe: options?.timeframe || '30d'
        },
        summary: {
          totalActiveDays: 0,
          mostActiveFeature: 'none',
          growthTrend: 'stable'
        },
        options: {
          includeEngagement: options?.includeEngagement || false,
          includeConversions: options?.includeConversions || false,
          includeAdvancedMetrics: options?.includeAdvancedMetrics || false
        }
      };
    }
  }

  /**
   * Get profile performance metrics
   */
  async getProfilePerformance(businessId: string): Promise<ProfilePerformance> {
    try {
      const business = await Business.findById(businessId);
      const brandSettings = await BrandSettings.findOne({ business: businessId });

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const completeness = business.getProfileCompleteness?.() || 0;
      const performance = {
        completeness,
        score: this.calculateProfileScore(business, brandSettings),
        missingFields: this.getMissingProfileFields(business, brandSettings),
        recommendations: this.getProfileRecommendations(completeness),
        lastUpdated: business.updatedAt,
        visibility: this.calculateProfileVisibility(business, brandSettings)
      };

      return performance;
    } catch (error) {
      logger.error('Error getting profile performance:', error);
      throw error;
    }
  }

  /**
   * Get account summary
   */
  async getAccountSummary(businessId: string): Promise<AccountSummary> {
    try {
      const [business, brandSettings, billing] = await Promise.all([
        Business.findById(businessId).select('-password'),
        BrandSettings.findOne({ business: businessId }),
        this.getBillingInfo(businessId)
      ]);

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      return {
        id: businessId,
        businessName: business.businessName,
        email: business.email,
        plan: billing?.plan || 'foundation',
        status: business.isActive ? 'active' : 'inactive',
        verified: business.isEmailVerified,
        createdAt: business.createdAt,
        lastLoginAt: business.lastLoginAt,
        profileCompleteness: business.getProfileCompleteness?.() || 0,
        walletConnected: !!brandSettings?.web3Settings?.certificateWallet,
        industry: business.industry
      };
    } catch (error) {
      logger.error('Error getting account summary:', error);
      throw error;
    }
  }

  /**
   * Get dashboard analytics data
   */
  async getDashboardAnalytics(businessId: string): Promise<{
    overview: any;
    charts: any[];
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const analytics = await this.getAccountAnalytics(businessId, { timeframe: '30d' });
      const performance = await this.getProfilePerformance(businessId);

      return {
        overview: {
          profileViews: analytics.profileViews.views || 0,
          certificatesIssued: analytics.certificateUsage.issued || 0,
          activeDays: analytics.summary.totalActiveDays,
          profileScore: performance.score
        },
        charts: [
          {
            type: 'line',
            title: 'Profile Views Over Time',
            data: []
          },
          {
            type: 'bar',
            title: 'Feature Usage',
            data: []
          }
        ],
        insights: [
          `Your profile has been viewed ${analytics.profileViews.views || 0} times this month`,
          `Profile completeness is at ${performance.completeness}%`,
          `Most active feature: ${analytics.summary.mostActiveFeature}`
        ],
        recommendations: performance.recommendations
      };
    } catch (error) {
      logger.error('Error getting dashboard analytics:', error);
      return {
        overview: {},
        charts: [],
        insights: [],
        recommendations: []
      };
    }
  }

  /**
   * Get API usage metrics
   */
  private async getApiUsage(businessId: string, since: Date): Promise<any> {
    return { calls: 0, endpoints: [], quotaUsed: 0, quotaLimit: 1000 };
  }

  /**
   * Get certificate usage metrics
   */
  private async getCertificateUsage(businessId: string, since: Date): Promise<any> {
    return { issued: 0, verified: 0, pending: 0 };
  }

  /**
   * Get voting activity metrics
   */
  private async getVotingActivity(businessId: string, since: Date): Promise<any> {
    return { votes: 0, proposals: 0, participation: 0 };
  }

  /**
   * Get login activity metrics
   */
  private async getLoginActivity(businessId: string, since: Date): Promise<any> {
    return { activeDays: 0, totalSessions: 0, averageSessionTime: 0 };
  }

  /**
   * Get profile views metrics
   */
  private async getProfileViews(businessId: string, since: Date): Promise<any> {
    const business = await Business.findById(businessId).select('profileViews');
    return { views: business?.profileViews || 0, uniqueVisitors: 0 };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(businessId: string, since: Date): Promise<any> {
    try {
      return {
        totalInteractions: 0,
        uniqueUsers: 0,
        averageSessionTime: 0,
        bounceRate: 0,
        featureAdoption: {
          certificates: 0,
          voting: 0,
          partnerships: 0
        }
      };
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      return {};
    }
  }

  /**
   * Get conversion metrics
   */
  private async getConversionMetrics(businessId: string, since: Date): Promise<any> {
    try {
      return {
        visitorToUser: 0,
        freeToPaid: 0,
        trialConversion: 0,
        featureConversions: {
          certificates: 0,
          voting: 0,
          partnerships: 0
        }
      };
    } catch (error) {
      logger.error('Error getting conversion metrics:', error);
      return {};
    }
  }

  /**
   * Get advanced metrics
   */
  private async getAdvancedMetrics(businessId: string, since: Date): Promise<any> {
    try {
      return {
        predictions: {
          nextMonthUsage: 0,
          churnRisk: 'low',
          growthTrend: 'stable'
        },
        cohortAnalysis: {},
        revenueAttribution: {},
        customMetrics: {}
      };
    } catch (error) {
      logger.error('Error getting advanced metrics:', error);
      return {};
    }
  }

  /**
   * Calculate profile score
   */
  private calculateProfileScore(business: any, brandSettings: any): number {
    let score = 0;

    // Basic information (40 points)
    if (business.businessName) score += 10;
    if (business.email && business.isEmailVerified) score += 10;
    if (business.industry) score += 10;
    if (business.description) score += 10;

    // Profile completeness (30 points)
    if (business.profilePictureUrl) score += 10;
    if (business.contactEmail) score += 10;
    if (business.socialUrls && Object.keys(business.socialUrls).length > 0) score += 10;

    // Verification status (20 points)
    if (business.isEmailVerified) score += 10;
    if (brandSettings?.businessVerified) score += 10;

    // Additional features (10 points)
    if (brandSettings?.web3Settings?.certificateWallet) score += 5;
    if (brandSettings?.customDomain) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Get missing profile fields
   */
  private getMissingProfileFields(business: any, brandSettings: any): string[] {
    const missing = [];
    if (!business.description) missing.push('description');
    if (!business.website) missing.push('website');
    if (!business.industry) missing.push('industry');
    if (!business.profilePictureUrl) missing.push('profilePicture');
    if (!business.contactEmail) missing.push('contactEmail');
    if (!brandSettings?.customDomain) missing.push('customDomain');
    return missing;
  }

  /**
   * Get profile recommendations
   */
  private getProfileRecommendations(completeness: number): string[] {
    if (completeness < 50) {
      return ['Add business description', 'Upload logo', 'Complete contact information'];
    }
    if (completeness < 80) {
      return ['Add social media links', 'Upload additional photos', 'Complete business verification'];
    }
    return ['Connect wallet for Web3 features', 'Enable API access'];
  }

  /**
   * Calculate profile visibility
   */
  private calculateProfileVisibility(business: any, brandSettings: any): string {
    if (business.isEmailVerified && brandSettings?.businessVerified) return 'high';
    if (business.isEmailVerified) return 'medium';
    return 'low';
  }

  /**
   * Get most active feature
   */
  private getMostActiveFeature(analytics: any): string {
    const features = {
      certificates: analytics.certificateUsage?.issued || 0,
      voting: analytics.votingActivity?.votes || 0,
      api: analytics.apiUsage?.calls || 0,
      profile: analytics.profileViews?.views || 0
    };

    const maxFeature = Object.entries(features).reduce((a, b) =>
      features[a[0] as keyof typeof features] > features[b[0] as keyof typeof features] ? a : b
    );

    return maxFeature[0];
  }

  /**
   * Calculate growth trend
   */
  private calculateGrowthTrend(analytics: any): string {
    return 'stable';
  }

  /**
   * Get billing info
   */
  private async getBillingInfo(businessId: string): Promise<any> {
    return null;
  }
}