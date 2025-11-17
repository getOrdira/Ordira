// src/services/brands/features/discovery.service.ts
import { Business } from '../../../models/core/business.model';
import { logger } from '../../../utils/logger';

export interface BrandRecommendation {
  id: string;
  type: string;
  title: string;
  priority: string;
  description?: string;
  actionUrl?: string;
}

export interface ConnectionOpportunity {
  businessId: string;
  businessName: string;
  industry: string;
  profilePictureUrl?: string;
  description?: string;
  compatibilityScore: number;
  connectionReason: string;
  opportunityType: string;
}

export interface SearchSuggestion {
  type: string;
  text: string;
  category?: string;
}

export interface EcosystemAnalytics {
  overview: {
    totalBrands: number;
    newBrandsThisMonth: number;
    activePartnerships: number;
  };
  trends: {
    growthRate: number;
    popularIndustries: string[];
  };
}

export class DiscoveryService {

  /**
   * Get personalized recommendations for a business
   */
  async getPersonalizedRecommendations(
    businessId: string,
    options?: { type?: string; limit?: number }
  ): Promise<BrandRecommendation[]> {
    try {
      const limit = options?.limit || 10;
      const type = options?.type;

      const business = await Business.findById(businessId);
      if (!business) {
        return [];
      }

      const recommendations: BrandRecommendation[] = [];

      // Profile completion recommendations
      if (!business.profilePictureUrl) {
        recommendations.push({
          id: 'upload_logo',
          type: 'profile',
          title: 'Upload your brand logo',
          priority: 'high',
          description: 'A professional logo increases trust and recognition',
          actionUrl: '/settings/profile'
        });
      }

      // Industry-specific recommendations
      if (business.industry) {
        recommendations.push({
          id: 'industry_connect',
          type: 'partnership',
          title: `Connect with other ${business.industry} brands`,
          priority: 'medium',
          description: 'Build partnerships within your industry',
          actionUrl: `/discovery?industry=${business.industry}`
        });
      }

      // Verification recommendations
      if (!business.isEmailVerified) {
        recommendations.push({
          id: 'verify_email',
          type: 'verification',
          title: 'Verify your email address',
          priority: 'high',
          description: 'Email verification is required for full platform access',
          actionUrl: '/verification/email'
        });
      }

      // Feature adoption recommendations
      recommendations.push({
        id: 'explore_certificates',
        type: 'feature',
        title: 'Explore certificate features',
        priority: 'medium',
        description: 'Issue and manage certificates for your products',
        actionUrl: '/certificates'
      });

      // Filter by type if specified
      const filtered = type ? recommendations.filter(r => r.type === type) : recommendations;

      return filtered.slice(0, limit);
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get connection opportunities for a business
   */
  async getConnectionOpportunities(
    businessId: string,
    options?: {
      limit?: number;
      industry?: string;
      manufacturerId?: string;
    }
  ): Promise<ConnectionOpportunity[]> {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const limit = options?.limit || 10;
      const manufacturerId = options?.manufacturerId;

      // Build query for potential connections
      const query: any = {
        _id: { $ne: businessId },
        isActive: true
      };

      // If manufacturerId is provided, we're looking for brand opportunities for that manufacturer
      if (manufacturerId) {
        query.industry = { $in: [business.industry, 'general'] };
      } else {
        query.industry = business.industry;
      }

      const opportunities = await Business.find(query)
        .select('businessName industry profilePictureUrl description')
        .limit(limit);

      const results: ConnectionOpportunity[] = [];
      for (const opp of opportunities) {
        const compatibilityScore = await this.calculateCompatibilityScore(businessId, opp._id.toString());

        results.push({
          businessId: opp._id.toString(),
          businessName: opp.businessName,
          industry: opp.industry,
          profilePictureUrl: opp.profilePictureUrl,
          description: opp.description,
          compatibilityScore: compatibilityScore.score,
          connectionReason: this.getConnectionReason(business, opp.toObject(), manufacturerId),
          opportunityType: manufacturerId ? 'brand_partnership' : 'peer_connection'
        });
      }

      return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    } catch (error) {
      logger.error('Error getting connection opportunities:', error);
      return [];
    }
  }

  /**
   * Calculate compatibility score between two brands
   */
  async calculateCompatibilityScore(brandId1: string, brandId2: string): Promise<{
    score: number;
    factors: any[];
    recommendations: string[];
  }> {
    try {
      const [brand1, brand2] = await Promise.all([
        Business.findById(brandId1),
        Business.findById(brandId2)
      ]);

      if (!brand1 || !brand2) {
        return {
          score: 0,
          factors: [],
          recommendations: ['Unable to calculate compatibility - brand not found']
        };
      }

      let score = 0;
      const factors = [];
      const recommendations = [];

      // Industry compatibility (40% weight)
      if (brand1.industry === brand2.industry) {
        score += 40;
        factors.push({
          factor: 'Industry Match',
          score: 40,
          description: `Both brands are in ${brand1.industry}`
        });
      } else {
        factors.push({
          factor: 'Industry Mismatch',
          score: 0,
          description: `Different industries: ${brand1.industry} vs ${brand2.industry}`
        });
        recommendations.push('Consider cross-industry collaboration opportunities');
      }

      // Verification status (20% weight)
      if (brand1.isEmailVerified && brand2.isEmailVerified) {
        score += 20;
        factors.push({
          factor: 'Both Verified',
          score: 20,
          description: 'Both brands have verified accounts'
        });
      } else {
        const verifiedCount = (brand1.isEmailVerified ? 1 : 0) + (brand2.isEmailVerified ? 1 : 0);
        const partialScore = verifiedCount * 10;
        score += partialScore;
        factors.push({
          factor: 'Partial Verification',
          score: partialScore,
          description: `${verifiedCount} out of 2 brands verified`
        });
        if (!brand1.isEmailVerified || !brand2.isEmailVerified) {
          recommendations.push('Complete account verification to increase trust');
        }
      }

      // Base compatibility (remaining 40%)
      score += 35;
      factors.push({
        factor: 'Base Compatibility',
        score: 35,
        description: 'General platform compatibility'
      });

      // Add recommendations based on score
      if (score >= 80) {
        recommendations.push('Highly compatible - consider immediate partnership');
      } else if (score >= 60) {
        recommendations.push('Good compatibility - explore collaboration opportunities');
      } else if (score >= 40) {
        recommendations.push('Moderate compatibility - may require alignment efforts');
      } else {
        recommendations.push('Low compatibility - consider alternative partnerships');
      }

      return {
        score: Math.min(score, 100),
        factors,
        recommendations
      };
    } catch (error) {
      logger.error('Error calculating compatibility:', error);
      return {
        score: 0,
        factors: [],
        recommendations: ['Error calculating compatibility']
      };
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string, options?: { limit?: number }): Promise<SearchSuggestion[]> {
    try {
      if (!query || query.length < 2) return [];

      const limit = options?.limit || 10;
      const businesses = await Business.find({
        businessName: { $regex: query, $options: 'i' },
        isActive: true
      })
        .select('businessName industry')
        .limit(limit);

      return businesses.map(b => ({
        type: 'business',
        text: b.businessName,
        category: b.industry
      }));
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get ecosystem analytics
   */
  async getEcosystemAnalytics(options?: any): Promise<EcosystemAnalytics> {
    try {
      const totalBrands = await Business.countDocuments({ isActive: true });
      return {
        overview: {
          totalBrands,
          newBrandsThisMonth: 0,
          activePartnerships: 0
        },
        trends: {
          growthRate: 0,
          popularIndustries: []
        }
      };
    } catch (error) {
      logger.error('Error getting ecosystem analytics:', error);
      return {
        overview: {
          totalBrands: 0,
          newBrandsThisMonth: 0,
          activePartnerships: 0
        },
        trends: {
          growthRate: 0,
          popularIndustries: []
        }
      };
    }
  }

  /**
   * Get connection reason between two brands
   */
  private getConnectionReason(brand1: any, brand2: any, manufacturerId?: string): string {
    if (manufacturerId) {
      return 'Similar industry focus - potential manufacturing partnership';
    }

    if (brand1.industry === brand2.industry) {
      return `Same industry: ${brand1.industry}`;
    }

    return 'Complementary business focus';
  }
}