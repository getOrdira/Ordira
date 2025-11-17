// src/services/brands/core/brandProfile.service.ts
import { BrandSettings, IBrandSettings } from '../../../models/brands/brandSettings.model';
import { Business, IBusiness } from '../../../models/core/business.model';
import { Invitation } from '../../../models/infrastructure/invitation.model';
import { connectionDataService } from '../../connections/core/connectionData.service';
import { matchingEngineService } from '../../connections/utils/matchingEngine.service';
import { recommendationsService } from '../../connections/features/recommendations.service';
import { logger } from '../../../utils/logger';

export interface BrandProfileSummary {
  id: string;
  businessId: string;
  businessName: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  subdomain: string;
  customDomain?: string;
}

export interface BrandAnalytics {
  profileViews: number;
  engagement: number;
  popularity: number;
  connectionCount: number;
  totalInvitationsSent: number;
  totalInvitationsReceived: number;
  acceptanceRate: number;
  lastActivity?: Date;
}

export interface BrandReport {
  id: string;
  brandId: string;
  reportedBy: string;
  reason: string;
  description: string;
  evidence?: any;
  status: 'submitted' | 'under_review' | 'resolved' | 'dismissed';
  reportMetadata?: any;
  generatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolutionNotes?: string;
}

type PopulatedBrandSettings = IBrandSettings & { business: IBusiness };

export class BrandProfileCoreService {
  /**
   * List all brand profiles with basic presentation metadata.
   */
  async listBrandProfiles(): Promise<BrandProfileSummary[]> {
    try {
      const settings = await BrandSettings
        .find({ isActive: true })
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to list brand profiles', {}, error as Error);
      return [];
    }
  }

  /**
   * Get a single brand profile by its settings identifier.
   */
  async getBrandProfile(id: string): Promise<BrandProfileSummary> {
    const setting = await BrandSettings
      .findById(id)
      .populate<PopulatedBrandSettings>('business', 'businessName')
      .lean();

    if (!setting || !setting.business) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }

    return this.mapSettingsToProfile(setting);
  }

  /**
   * Get an individual brand profile using the public subdomain.
   */
  async getBrandProfileBySubdomain(subdomain: string): Promise<BrandProfileSummary | null> {
    try {
      const setting = await BrandSettings
        .findOne({ subdomain, isActive: true })
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      if (!setting || !setting.business) {
        return null;
      }

      return this.mapSettingsToProfile(setting);
    } catch (error) {
      logger.error('Failed to get brand profile by subdomain', { subdomain }, error as Error);
      return null;
    }
  }

  /**
   * Resolve a brand profile from a custom domain if configured.
   */
  async getBrandProfileByCustomDomain(customDomain: string): Promise<BrandProfileSummary | null> {
    try {
      const setting = await BrandSettings
        .findOne({ customDomain, isActive: true })
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      if (!setting || !setting.business) {
        return null;
      }

      return this.mapSettingsToProfile(setting);
    } catch (error) {
      logger.error('Failed to get brand profile by custom domain', { customDomain }, error as Error);
      return null;
    }
  }

  /**
   * Search brand profiles by business name using case-insensitive matching.
   */
  async searchBrandProfiles(query: string): Promise<BrandProfileSummary[]> {
    try {
      const businesses = await Business.find({
        businessName: { $regex: query, $options: 'i' },
        isActive: true
      }).select('_id businessName').lean();

      if (businesses.length === 0) {
        return [];
      }

      const businessIds = businesses.map(b => b._id);
      const settings = await BrandSettings
        .find({ 
          business: { $in: businessIds },
          isActive: true
        })
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to search brand profiles', { query }, error as Error);
      return [];
    }
  }

  /**
   * Helper to normalize brand settings into the shared summary shape.
   */
  protected mapSettingsToProfile(setting: any): BrandProfileSummary {
    const business = setting.business;

    return {
      id: setting._id.toString(),
      businessId: business._id.toString(),
      businessName: business.businessName,
      themeColor: setting.themeColor,
      logoUrl: setting.logoUrl,
      bannerImages: setting.bannerImages,
      subdomain: setting.subdomain || '',
      customDomain: setting.customDomain
    };
  }

  /**
   * Get public analytics for a brand
   */
  async getPublicAnalytics(brandId: string): Promise<BrandAnalytics> {
    try {
      const brandSettings = await BrandSettings.findOne({ business: brandId }).lean();
      
      if (!brandSettings) {
        throw { statusCode: 404, message: 'Brand settings not found' };
      }

      const connectionCount = await connectionDataService.getBrandConnectionCount(
        brandSettings._id.toString()
      );

      const invitationStats = await Invitation.aggregate([
        {
          $match: { brand: brandSettings._id }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalSent = invitationStats.reduce((sum, stat) => sum + stat.count, 0);
      const accepted = invitationStats.find(s => s._id === 'accepted')?.count || 0;
      const acceptanceRate = totalSent > 0 ? Math.round((accepted / totalSent) * 100) : 0;

      const lastInvitation = await Invitation
        .findOne({ brand: brandSettings._id })
        .sort({ createdAt: -1 })
        .select('createdAt')
        .lean();

      return {
        profileViews: 0,
        engagement: connectionCount > 0 ? Math.min(connectionCount * 10, 100) : 0,
        popularity: acceptanceRate,
        connectionCount,
        totalInvitationsSent: totalSent,
        totalInvitationsReceived: 0,
        acceptanceRate,
        lastActivity: lastInvitation?.createdAt
      };
    } catch (error) {
      logger.error('Failed to get public analytics', { brandId }, error as Error);
      throw error;
    }
  }

  /**
   * Get related brands based on similarity
   */
  async getRelatedBrands(
    brandId: string,
    options: { limit?: number; similarity?: string }
  ): Promise<BrandProfileSummary[]> {
    try {
      const limit = options.limit || 5;
      
      const currentBusiness = await Business.findById(brandId).select('industry').lean();
      
      if (!currentBusiness) {
        return [];
      }

      const query: any = {
        _id: { $ne: brandId },
        isActive: true
      };

      if (currentBusiness.industry) {
        query.industry = currentBusiness.industry;
      }

      const relatedBusinesses = await Business
        .find(query)
        .limit(limit * 2)
        .select('_id businessName')
        .lean();

      if (relatedBusinesses.length === 0) {
        return this.getNewestBrands({ limit });
      }

      const businessIds = relatedBusinesses.map(b => b._id);
      const settings = await BrandSettings
        .find({ 
          business: { $in: businessIds },
          isActive: true
        })
        .limit(limit)
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to get related brands', { brandId, options }, error as Error);
      return [];
    }
  }

  /**
   * Track profile view for analytics
   */
  async trackProfileView(brandId: string, viewData: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      logger.info('Brand profile viewed', {
        brandId,
        ipAddress: viewData.ipAddress?.substring(0, 10) + '...',
        userAgent: viewData.userAgent?.substring(0, 50),
        referrer: viewData.referrer,
        timestamp: viewData.timestamp
      });
      
      const business = await Business.findById(brandId);
      if (business) {
        business.profileViews = (business.profileViews || 0) + 1;
        await business.save();
      }
    } catch (error) {
      logger.error('Failed to track profile view', { brandId }, error as Error);
    }
  }

  /**
   * Get brand profile with manufacturer context
   */
  async getBrandProfileForManufacturer(brandId: string, manufacturerId: string): Promise<any> {
    try {
      const profile = await this.getBrandProfile(brandId);
      
      const brandSettings = await BrandSettings.findOne({ business: brandId }).select('_id').lean();
      if (!brandSettings) {
        throw { statusCode: 404, message: 'Brand settings not found' };
      }

      const hasConnection = await connectionDataService.areConnected(
        brandSettings._id.toString(),
        manufacturerId
      );

      const invitation = await Invitation
        .findOne({
          brand: brandSettings._id,
          manufacturer: manufacturerId
        })
        .sort({ createdAt: -1 })
        .select('status createdAt respondedAt')
        .lean();

      return {
        ...profile,
        manufacturerContext: {
          hasConnection,
          connectionStatus: invitation?.status || 'none',
          lastInteraction: invitation?.respondedAt || invitation?.createdAt || null,
          canInvite: !hasConnection && (!invitation || invitation.status !== 'pending')
        }
      };
    } catch (error) {
      logger.error('Failed to get brand profile for manufacturer', { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Calculate compatibility score between brand and manufacturer
   */
  async calculateCompatibilityScore(brandId: string, manufacturerId: string): Promise<{
    score: number;
    factors: any[];
    recommendations: string[];
  }> {
    try {
      const brandSettings = await BrandSettings.findOne({ business: brandId }).lean();
      if (!brandSettings) {
        throw { statusCode: 404, message: 'Brand settings not found' };
      }

      const compatibility = await matchingEngineService.getCompatibilityForPair(
        brandSettings._id.toString(),
        manufacturerId
      );

      if (!compatibility) {
        return {
          score: 0,
          factors: [],
          recommendations: ['No compatibility data available']
        };
      }

      const factors = compatibility.reasons.map((reason, index) => ({
        name: reason,
        score: Math.max(50, compatibility.score - (index * 5)),
        weight: 1 / compatibility.reasons.length
      }));

      return {
        score: compatibility.score,
        factors,
        recommendations: this.generateCompatibilityRecommendations(compatibility.score, compatibility.reasons)
      };
    } catch (error) {
      logger.error('Failed to calculate compatibility score', { brandId, manufacturerId }, error as Error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on compatibility score
   */
  private generateCompatibilityRecommendations(score: number, reasons: string[]): string[] {
    const recommendations: string[] = [];

    if (score >= 80) {
      recommendations.push('Excellent match! Consider reaching out soon.');
      recommendations.push('High probability of successful partnership.');
    } else if (score >= 60) {
      recommendations.push('Good potential for collaboration.');
      recommendations.push('Review specific requirements before connecting.');
    } else if (score >= 40) {
      recommendations.push('Moderate compatibility detected.');
      recommendations.push('May require additional communication to align goals.');
    } else {
      recommendations.push('Limited compatibility detected.');
      recommendations.push('Consider exploring other manufacturer options.');
    }

    if (reasons.length > 0) {
      recommendations.push(`Key strengths: ${reasons.slice(0, 2).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Get connection opportunities for a brand
   */
  async getConnectionOpportunities(brandId: string, options: {
    limit?: number;
    manufacturerId?: string;
  }): Promise<any[]> {
    try {
      const limit = options.limit || 10;
      
      const brandSettings = await BrandSettings.findOne({ business: brandId }).lean();
      if (!brandSettings) {
        return [];
      }

      const recommendations = await recommendationsService.getManufacturerRecommendationsForBrand(
        brandSettings._id.toString(),
        { limit, excludeConnected: true, excludePending: true }
      );

      return recommendations.map((rec, index) => ({
        id: `opp_${rec.manufacturerId}_${Date.now()}`,
        type: 'manufacturer_connection',
        title: `Partnership with ${rec.manufacturer.name}`,
        description: rec.reasons.join('. '),
        matchScore: rec.score,
        manufacturerId: rec.manufacturerId,
        manufacturer: rec.manufacturer,
        priority: index < 3 ? 'high' : index < 7 ? 'medium' : 'low',
        estimatedValue: this.estimateOpportunityValue(rec.score)
      }));
    } catch (error) {
      logger.error('Failed to get connection opportunities', { brandId, options }, error as Error);
      return [];
    }
  }

  /**
   * Estimate opportunity value based on match score
   */
  private estimateOpportunityValue(score: number): string {
    if (score >= 85) {
      return '$100,000 - $250,000';
    } else if (score >= 70) {
      return '$50,000 - $100,000';
    } else if (score >= 55) {
      return '$25,000 - $50,000';
    } else {
      return '$10,000 - $25,000';
    }
  }

  /**
   * Get featured brands
   */
  async getFeaturedBrands(options: { limit?: number }): Promise<BrandProfileSummary[]> {
    try {
      const limit = options.limit || 10;
      
      const activeBusinesses = await Business
        .find({ isActive: true, isEmailVerified: true })
        .select('_id businessName profileViews')
        .sort({ profileViews: -1, createdAt: -1 })
        .limit(limit * 2)
        .lean();

      const businessIds = activeBusinesses.map(b => b._id);
      const settings = await BrandSettings
        .find({ 
          business: { $in: businessIds },
          isActive: true
        })
        .limit(limit)
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to get featured brands', options, error as Error);
      return [];
    }
  }

  /**
   * Get trending brands
   */
  async getTrendingBrands(options: { limit?: number }): Promise<BrandProfileSummary[]> {
    try {
      const limit = options.limit || 10;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentlyActiveBusinesses = await Invitation
        .aggregate([
          {
            $match: {
              createdAt: { $gte: thirtyDaysAgo },
              status: 'accepted'
            }
          },
          {
            $lookup: {
              from: 'brandsettings',
              localField: 'brand',
              foreignField: '_id',
              as: 'brandSettings'
            }
          },
          { $unwind: '$brandSettings' },
          {
            $group: {
              _id: '$brandSettings.business',
              activityScore: { $sum: 1 }
            }
          },
          { $sort: { activityScore: -1 } },
          { $limit: limit * 2 }
        ]);

      if (recentlyActiveBusinesses.length === 0) {
        return this.getNewestBrands(options);
      }

      const businessIds = recentlyActiveBusinesses.map(item => item._id);
      const settings = await BrandSettings
        .find({ 
          business: { $in: businessIds },
          isActive: true
        })
        .limit(limit)
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to get trending brands', options, error as Error);
      return this.getNewestBrands(options);
    }
  }

  /**
   * Get newest brands
   */
  async getNewestBrands(options: { limit?: number }): Promise<BrandProfileSummary[]> {
    try {
      const limit = options.limit || 10;
      
      const settings = await BrandSettings
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return settings
        .filter(setting => setting.business)
        .map(setting => this.mapSettingsToProfile(setting));
    } catch (error) {
      logger.error('Failed to get newest brands', options, error as Error);
      return [];
    }
  }

  /**
   * Get spotlight brand (featured brand of the day/week)
   */
  async getSpotlightBrand(): Promise<BrandProfileSummary | null> {
    try {
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      
      const totalBrands = await BrandSettings.countDocuments({ isActive: true });
      if (totalBrands === 0) {
        return null;
      }

      const skipCount = dayOfYear % totalBrands;
      
      const settings = await BrandSettings
        .findOne({ isActive: true })
        .sort({ profileViews: -1, createdAt: -1 })
        .skip(skipCount)
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      if (!settings || !settings.business) {
        return null;
      }

      return this.mapSettingsToProfile(settings);
    } catch (error) {
      logger.error('Failed to get spotlight brand', {}, error as Error);
      return null;
    }
  }

  /**
   * Get featured categories
   */
  async getFeaturedCategories(): Promise<any[]> {
    try {
      const industryStats = await Business.aggregate([
        {
          $match: {
            isActive: true,
            isEmailVerified: true,
            industry: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        }
      ]);

      const iconMap: Record<string, string> = {
        'Fashion': 'fashion',
        'Electronics': 'electronics',
        'Food & Beverage': 'food',
        'Food': 'food',
        'Home & Garden': 'home',
        'Technology': 'tech',
        'Health & Wellness': 'health',
        'Automotive': 'automotive',
        'Beauty': 'beauty',
        'Sports': 'sports'
      };

      return industryStats.map(stat => ({
        name: stat._id,
        count: stat.count,
        icon: iconMap[stat._id] || 'default'
      }));
    } catch (error) {
      logger.error('Failed to get featured categories', {}, error as Error);
      return [];
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const results = await Business
        .find({
          businessName: { $regex: query, $options: 'i' },
          isActive: true
        })
        .select('businessName')
        .limit(5)
        .lean();
      
      return results.map(r => r.businessName);
    } catch (error) {
      logger.error('Failed to get search suggestions', { query }, error as Error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(): Promise<string[]> {
    try {
      const topIndustries = await Business.aggregate([
        {
          $match: {
            isActive: true,
            industry: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 5
        }
      ]);

      return topIndustries.map(item => item._id);
    } catch (error) {
      logger.error('Failed to get popular search terms', {}, error as Error);
      return [];
    }
  }

  /**
   * Get trending search terms
   */
  async getTrendingSearchTerms(): Promise<string[]> {
    try {
      const recentBusinesses = await Business
        .find({
          isActive: true,
          industry: { $exists: true, $ne: null },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
        .select('industry')
        .lean();

      const industryCounts = recentBusinesses.reduce((acc, business) => {
        if (business.industry) {
          acc[business.industry] = (acc[business.industry] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(industryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([industry]) => industry);
    } catch (error) {
      logger.error('Failed to get trending search terms', {}, error as Error);
      return [];
    }
  }

  /**
   * Get ecosystem analytics (public marketplace stats)
   */
  async getEcosystemAnalytics(options: { timeframe?: string }): Promise<any> {
    try {
      const timeframeMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '365d': 365
      };
      
      const days = timeframeMap[options.timeframe || '30d'] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalBrands, activeBrands, newBrands, totalConnections, topIndustries] = await Promise.all([
        BrandSettings.countDocuments({ isActive: true }),
        BrandSettings.countDocuments({ 
          isActive: true,
          updatedAt: { $gte: startDate }
        }),
        BrandSettings.countDocuments({ 
          createdAt: { $gte: startDate }
        }),
        Invitation.countDocuments({ status: 'accepted' }),
        Business.aggregate([
          {
            $match: {
              isActive: true,
              industry: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: '$industry',
              count: { $sum: 1 }
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 5
          }
        ])
      ]);

      return {
        totalBrands,
        activeBrands,
        newBrandsThisMonth: newBrands,
        totalConnections,
        averageConnectionsPerBrand: totalBrands > 0 ? (totalConnections / totalBrands).toFixed(2) : 0,
        topIndustries: topIndustries.map(item => ({
          name: item._id,
          count: item.count
        })),
        timeframe: options.timeframe || '30d'
      };
    } catch (error) {
      logger.error('Failed to get ecosystem analytics', options, error as Error);
      throw error;
    }
  }

  /**
   * Create a brand report
   */
  async createBrandReport(brandId: string, reportData: {
    reason: string;
    description: string;
    evidence?: any;
    reportedBy: string;
    reportMetadata?: any;
  }): Promise<BrandReport> {
    try {
      const brandExists = await Business.exists({ _id: brandId });
      if (!brandExists) {
        throw { statusCode: 404, message: 'Brand not found' };
      }

      const report: BrandReport = {
        id: `report_${brandId}_${Date.now()}`,
        brandId,
        reportedBy: reportData.reportedBy,
        reason: reportData.reason,
        description: reportData.description,
        evidence: reportData.evidence,
        status: 'submitted',
        reportMetadata: {
          ...reportData.reportMetadata,
          userAgent: reportData.reportMetadata?.userAgent,
          ipAddress: reportData.reportMetadata?.ipAddress
        },
        generatedAt: new Date()
      };

      logger.info('Brand report created', {
        reportId: report.id,
        brandId,
        reason: reportData.reason
      });

      return report;
    } catch (error) {
      logger.error('Failed to create brand report', { brandId, reportData }, error as Error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for a manufacturer
   */
  async getPersonalizedRecommendations(manufacturerId: string, options: {
    type?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const limit = options.limit || 10;
      
      const brandRecommendations = await recommendationsService.getBrandRecommendationsForManufacturer(
        manufacturerId,
        limit
      );

      const brandIds = brandRecommendations.map(rec => rec.brandId);
      const brandSettings = await BrandSettings
        .find({ business: { $in: brandIds }, isActive: true })
        .populate<PopulatedBrandSettings>('business', 'businessName')
        .lean();

      return brandRecommendations.map(rec => {
        const setting = brandSettings.find(s => s.business._id.toString() === rec.brandId);
        
        return {
          brand: setting ? this.mapSettingsToProfile(setting) : null,
          matchScore: rec.score,
          matchReasons: rec.reasons,
          recommendationType: options.type || 'compatibility_based'
        };
      }).filter(item => item.brand !== null);
    } catch (error) {
      logger.error('Failed to get personalized recommendations', { manufacturerId, options }, error as Error);
      return [];
    }
  }

  /**
   * Record recommendation feedback
   */
  async recordRecommendationFeedback(manufacturerId: string, brandId: string, feedbackData: {
    feedback: string;
    rating?: number;
    reason?: string;
    providedAt: Date;
  }): Promise<void> {
    try {
      logger.info('Recommendation feedback recorded', {
        manufacturerId,
        brandId,
        feedback: feedbackData.feedback,
        rating: feedbackData.rating,
        reason: feedbackData.reason
      });
    } catch (error) {
      logger.error('Failed to record recommendation feedback', { manufacturerId, brandId, feedbackData }, error as Error);
    }
  }
}

export const brandProfileCoreService = new BrandProfileCoreService();

export type BrandProfile = BrandProfileSummary;


