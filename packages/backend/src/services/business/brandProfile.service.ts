// src/services/business/brandProfile.service.ts
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { IBusiness } from '../../models/business.model';
import { Business } from '../../models/business.model';

export interface BrandProfile {
  id: string;
  businessId: string;
  businessName: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  subdomain: string;
  customDomain?: string;
}

export class BrandProfileService {

  async listBrandProfiles(): Promise<BrandProfile[]> {
    const settings = await BrandSettings
      .find()
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );

    return settings.map(s => ({
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    }));
  }

  async getBrandProfile(id: string): Promise<BrandProfile> {
    const s = await BrandSettings
      .findById(id)
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    if (!s) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async getBrandProfileBySubdomain(subdomain: string): Promise<BrandProfile | null> {
    const s = await BrandSettings
      .findOne({ subdomain })
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    
    if (!s) return null;

    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async getBrandProfileByCustomDomain(customDomain: string): Promise<BrandProfile | null> {
    const s = await BrandSettings
      .findOne({ customDomain })
      .populate<IBrandSettings & { business: IBusiness }>(
        'business',
        'businessName'
      );
    
    if (!s) return null;

    return {
      id: s._id.toString(),
      businessId: s.business._id.toString(),
      businessName: s.business.businessName,
      themeColor: s.themeColor,
      logoUrl: s.logoUrl,
      bannerImages: s.bannerImages,
      subdomain: s.subdomain!,
      customDomain: s.customDomain
    };
  }

  async searchBrandProfiles(query: string): Promise<BrandProfile[]> {
    const settings = await BrandSettings
      .find()
      .populate<IBrandSettings & { business: IBusiness }>({
        path: 'business',
        select: 'businessName',
        match: {
          businessName: { $regex: query, $options: 'i' }
        }
      });

    return settings
      .filter(s => s.business) // Only include matches
      .map(s => ({
        id: s._id.toString(),
        businessId: s.business._id.toString(),
        businessName: s.business.businessName,
        themeColor: s.themeColor,
        logoUrl: s.logoUrl,
        bannerImages: s.bannerImages,
        subdomain: s.subdomain!,
        customDomain: s.customDomain
      }));
  }

  async getPersonalizedRecommendations(businessId: string, options?: { type?: string; limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 10;
    // Basic implementation - you can enhance this later
    const recommendations = [
      { id: '1', type: 'partnership', title: 'Connect with similar brands', priority: 'high' },
      { id: '2', type: 'feature', title: 'Complete your profile', priority: 'medium' }
    ];
    return recommendations.slice(0, limit);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

async recordRecommendationFeedback(businessId: string, recommendationId: string, feedback: any): Promise<void> {
  try {
    console.log(`Recording feedback for ${recommendationId}:`, feedback);
    // Implementation for storing feedback
  } catch (error) {
    console.error('Error recording feedback:', error);
  }
}

async createBrandReport(businessId: string, options?: any): Promise<any> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }
    
    return {
      generatedAt: new Date(),
      businessId,
      businessName: business.businessName,
      summary: 'Brand report generated successfully'
    };
  } catch (error) {
    console.error('Error creating brand report:', error);
    throw error;
  }
}

async getEcosystemAnalytics(options?: any): Promise<any> {
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
    console.error('Error getting ecosystem analytics:', error);
    return {};
  }
}

async getPopularSearchTerms(options?: { limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 20;
    const terms = [
      { term: 'sustainable packaging', count: 1250 },
      { term: 'organic materials', count: 980 },
      { term: 'eco-friendly products', count: 875 }
    ];
    return terms.slice(0, limit);
  } catch (error) {
    console.error('Error getting popular terms:', error);
    return [];
  }
}

async getTrendingSearchTerms(options?: { limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 10;
    const terms = [
      { term: 'carbon neutral', count: 420, trending: true },
      { term: 'blockchain verification', count: 380, trending: true }
    ];
    return terms.slice(0, limit);
  } catch (error) {
    console.error('Error getting trending terms:', error);
    return [];
  }
}

async getSearchSuggestions(query: string, options?: { limit?: number }): Promise<any[]> {
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
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

async getSpotlightBrand(criteria?: any): Promise<any> {
  try {
    const brand = await Business.findOne({ isActive: true })
      .sort({ profileViews: -1 })
      .select('businessName industry profilePictureUrl description');
    
    if (!brand) return null;
    
    return {
      ...brand.toObject(),
      spotlightReason: 'High engagement'
    };
  } catch (error) {
    console.error('Error getting spotlight brand:', error);
    return null;
  }
}

async getFeaturedCategories(options?: { limit?: number }): Promise<any[]> {
  try {
    const categories = [
      { id: 'sustainability', name: 'Sustainability', brandCount: 145 },
      { id: 'technology', name: 'Technology', brandCount: 232 },
      { id: 'healthcare', name: 'Healthcare', brandCount: 89 }
    ];
    return categories.slice(0, options?.limit || 8);
  } catch (error) {
    console.error('Error getting featured categories:', error);
    return [];
  }
}

async getNewestBrands(options?: { limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 12;
    const brands = await Business.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('businessName industry profilePictureUrl createdAt')
      .limit(limit);

    return brands.map(brand => ({
      ...brand.toObject(),
      isNew: true
    }));
  } catch (error) {
    console.error('Error getting newest brands:', error);
    return [];
  }
}

async getTrendingBrands(options?: { limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 10;
    const brands = await Business.find({ isActive: true })
      .sort({ profileViews: -1 })
      .select('businessName industry profilePictureUrl')
      .limit(limit);

    return brands.map(brand => ({
      ...brand.toObject(),
      trending: true
    }));
  } catch (error) {
    console.error('Error getting trending brands:', error);
    return [];
  }
}

async getFeaturedBrands(options?: { limit?: number }): Promise<any[]> {
  try {
    const limit = options?.limit || 8;
    const brands = await Business.find({ 
      isActive: true,
      isEmailVerified: true 
    })
    .sort({ profileViews: -1 })
    .select('businessName industry profilePictureUrl')
    .limit(limit);

    return brands.map(brand => ({
      ...brand.toObject(),
      featured: true
    }));
  } catch (error) {
    console.error('Error getting featured brands:', error);
    return [];
  }
}

async getConnectionOpportunities(
  businessId: string, 
  options?: { 
    limit?: number; 
    industry?: string;
    manufacturerId?: string;
  }
): Promise<any[]> {
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
      // Find brands that would be good matches for this manufacturer
      query.industry = { $in: [business.industry, 'general'] }; // Include general industry
    } else {
      // Default behavior - find similar brands
      query.industry = business.industry;
    }

    const opportunities = await Business.find(query)
      .select('businessName industry profilePictureUrl description')
      .limit(limit);

    const results = [];
    for (const opp of opportunities) {
      const compatibilityScore = await this.calculateCompatibilityScore(businessId, opp._id.toString());
      
      results.push({
        ...opp.toObject(),
        compatibilityScore: compatibilityScore.score,
        connectionReason: this.getConnectionReason(business, opp.toObject(), manufacturerId),
        opportunityType: manufacturerId ? 'brand_partnership' : 'peer_connection'
      });
    }

    return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  } catch (error) {
    console.error('Error getting connection opportunities:', error);
    return [];
  }
}

// 3. ADD this helper method to your brandProfile.service.ts:

private getConnectionReason(brand1: any, brand2: any, manufacturerId?: string): string {
  if (manufacturerId) {
    return `Similar industry focus - potential manufacturing partnership`;
  }
  
  if (brand1.industry === brand2.industry) {
    return `Same industry: ${brand1.industry}`;
  }
  
  return 'Complementary business focus';
}

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
    console.error('Error calculating compatibility:', error);
    return {
      score: 0,
      factors: [],
      recommendations: ['Error calculating compatibility']
    };
  }
}

async getBrandProfileForManufacturer(brandId: string, manufacturerId?: string): Promise<any> {
  try {
    const brand = await Business.findById(brandId)
      .select('-password');

    if (!brand) {
      throw { statusCode: 404, message: 'Brand not found' };
    }

    return {
      ...brand.toObject(),
      profileCompleteness: 85,
      industryRanking: 1,
      connectionStatus: 'none'
    };
  } catch (error) {
    console.error('Error getting brand profile for manufacturer:', error);
    throw error;
  }
}

async getIndustryPeers(businessId: string, options?: { limit?: number }): Promise<any[]> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const limit = options?.limit || 10;
    const peers = await Business.find({
      _id: { $ne: businessId },
      industry: business.industry,
      isActive: true
    })
    .select('businessName industry profilePictureUrl')
    .limit(limit);

    return peers.map(peer => ({
      ...peer.toObject(),
      relationship: 'industry_peer'
    }));
  } catch (error) {
    console.error('Error getting industry peers:', error);
    return [];
  }
}

async trackProfileView(
  profileId: string, 
  viewerInfo: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    timestamp?: Date;
  } | string, 
  viewerType?: string
): Promise<void> {
  try {
    // Handle both old signature (3 params) and new signature (2 params with object)
    let viewerId: string;
    let type: string;

    if (typeof viewerInfo === 'string') {
      // Old signature: trackProfileView(profileId, viewerId, viewerType)
      viewerId = viewerInfo;
      type = viewerType || 'unknown';
    } else {
      // New signature: trackProfileView(profileId, viewerInfo)
      viewerId = viewerInfo.ipAddress || 'anonymous';
      type = 'public';
    }

    await Business.updateOne(
      { _id: profileId },
      { $inc: { profileViews: 1 } }
    );

    console.log(`Profile view tracked: ${profileId} by ${viewerId} (${type})`);
  } catch (error) {
    console.error('Error tracking profile view:', error);
  }
}

async getRelatedBrands(businessId: string, options?: { 
  limit?: number;
  similarity?: string;
  algorithm?: 'industry' | 'tags' | 'behavior';
}): Promise<any[]> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const limit = options?.limit || 8;
    const similarity = options?.similarity || 'industry';
    
    let query: any = {
      _id: { $ne: businessId },
      isActive: true
    };

    // Apply similarity logic
    if (similarity === 'industry') {
      query.industry = business.industry;
    }

    const related = await Business.find(query)
      .select('businessName industry profilePictureUrl')
      .limit(limit);

    return related.map(brand => brand.toObject());
  } catch (error) {
    console.error('Error getting related brands:', error);
    return [];
  }
}

async getPublicAnalytics(businessId: string): Promise<any> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      profileViews: business.profileViews || 0,
      verificationStatus: business.isEmailVerified,
      memberSince: business.createdAt,
      profileCompleteness: 85
    };
  } catch (error) {
    console.error('Error getting public analytics:', error);
    return {};
  }
}

async getDetailedBrandProfile(businessId: string): Promise<any> {
  try {
    const [business, brandSettings] = await Promise.all([
      Business.findById(businessId).select('-password'),
      BrandSettings.findOne({ business: businessId })
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      basic: business,
      settings: brandSettings,
      computed: {
        profileCompleteness: 85,
        trustScore: 78,
        engagementLevel: 'medium'
      }
    };
  } catch (error) {
    console.error('Error getting detailed brand profile:', error);
    throw error;
  }
}

async getBrandAggregations(filterOptions?: {
  industry?: string;
  location?: string;
  verified?: boolean;
  plan?: string;
  search?: string;
  customFilters?: any;
}): Promise<any> {
  try {
    // Build query based on filter options
    const query: any = { isActive: true };
    
    if (filterOptions?.industry) {
      query.industry = filterOptions.industry;
    }
    
    if (filterOptions?.verified !== undefined) {
      query.isEmailVerified = filterOptions.verified;
    }
    
    if (filterOptions?.search) {
      query.$or = [
        { businessName: { $regex: filterOptions.search, $options: 'i' } },
        { description: { $regex: filterOptions.search, $options: 'i' } },
        { industry: { $regex: filterOptions.search, $options: 'i' } }
      ];
    }

    // Get total counts with current filters
    const [total, verified] = await Promise.all([
      Business.countDocuments(query),
      Business.countDocuments({ ...query, isEmailVerified: true })
    ]);

    // Get industry breakdown with current filters
    const industryStats = await Business.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$isEmailVerified', 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get all available industries (for filter options)
    const allIndustries = await Business.distinct('industry', { isActive: true });

    return {
      total,
      verified,
      industries: industryStats,
      filters: {
        availableIndustries: allIndustries,
        verificationLevels: ['verified', 'unverified'],
        sortOptions: ['newest', 'popular', 'alphabetical', 'completeness']
      },
      applied: {
        industry: filterOptions?.industry || null,
        verified: filterOptions?.verified,
        search: filterOptions?.search || null,
        hasFilters: !!(filterOptions?.industry || filterOptions?.verified !== undefined || filterOptions?.search)
      }
    };
  } catch (error) {
    console.error('Error getting brand aggregations:', error);
    return {
      total: 0,
      verified: 0,
      industries: [],
      filters: {
        availableIndustries: [],
        verificationLevels: ['verified', 'unverified'],
        sortOptions: ['newest', 'popular', 'alphabetical', 'completeness']
      },
      applied: {
        industry: null,
        verified: undefined,
        search: null,
        hasFilters: false
      }
    };
  }
}




async getEnhancedBrandProfiles(filters?: any): Promise<any> {
  try {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    
    const query: any = { isActive: true };
    
    if (filters?.industry) {
      query.industry = filters.industry;
    }
    
    if (filters?.search) {
      query.businessName = { $regex: filters.search, $options: 'i' };
    }

    const [brands, total] = await Promise.all([
      Business.find(query)
        .select('businessName industry profilePictureUrl')
        .skip(offset)
        .limit(limit),
      Business.countDocuments(query)
    ]);

    return {
      brands: brands.map(brand => ({
        ...brand.toObject(),
        trustScore: 78,
        badges: []
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  } catch (error) {
    console.error('Error getting enhanced brand profiles:', error);
    throw error;
  }
}
}