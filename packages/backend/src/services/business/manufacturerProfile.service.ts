// src/services/business/manufacturerProfile.service.ts

import { Manufacturer } from '../../models/manufacturer.model';
import { logger } from '../utils/logger';
import { Business } from '../../models/business.model';
import { BrandSettings } from '../../models/brandSettings.model';

export interface ManufacturerProfile {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  contactEmail?: string;
  socialUrls?: string[];
  website?: string;
  connectedBrandsCount?: number;
  isVerified?: boolean;
  profileCompleteness?: number;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  certifications?: string[];
  averageResponseTime?: number;
  clientSatisfactionRating?: number;
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: string;
  };
  lastActive?: Date;
  profileScore?: number;
}

export interface ManufacturerSearchResult {
  id: string;
  name: string;
  industry?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  isVerified?: boolean;
  profileCompleteness?: number;
  profileScore?: number;
  matchScore?: number;
  headquarters?: {
    country?: string;
    city?: string;
  };
  establishedYear?: number;
  certifications?: string[];
  averageResponseTime?: number;
  connectionSuccessRate?: number;
}

export interface SearchOptions {
  query?: string;
  industry?: string;
  services?: string[];
  minMoq?: number;
  maxMoq?: number;
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'industry' | 'moq' | 'profileCompleteness' | 'plan';
  sortOrder?: 'asc' | 'desc';
}

export interface AdvancedSearchCriteria {
  query?: string;
  industries?: string[];
  services?: string[];
  moqRange?: { min?: number; max?: number };
  location?: {
    country?: string;
    city?: string;
    radius?: number;
  };
  certifications?: string[];
  rating?: { min?: number };
  verified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  saveSearch?: boolean;
  searchName?: string;
}

export interface SearchResult {
  manufacturers: ManufacturerSearchResult[];
  total: number;
  aggregations?: any;
  suggestions?: string[];
  appliedFilters?: any;
  executionTime?: number;
}

export interface ProfileContext {
  connectionStatus: 'none' | 'pending' | 'connected' | 'rejected';
  canConnect: boolean;
  lastInteraction?: Date;
  analytics?: {
    profileViews: number;
    connectionRequests: number;
    responseRate: number;
  };
}

export interface ManufacturerStatistics {
  globalStats: {
    total: number;
    active: number;
    verified: number;
    averageProfileScore: number;
  };
  industryBreakdown: Array<{
    industry: string;
    count: number;
    averageScore: number;
  }>;
  trends: {
    newManufacturers: number;
    growthRate: number;
    topGrowingIndustries: string[];
  };
  topServices: Array<{
    service: string;
    count: number;
  }>;
  averageMetrics: {
    moq: number;
    responseTime: number;
    satisfaction: number;
    profileCompleteness: number;
  };
}

export interface ComparisonResult {
  manufacturers: ManufacturerProfile[];
  comparisonMatrix: Array<{
    metric: string;
    values: Array<{ manufacturerId: string; value: any; rank: number }>;
  }>;
  recommendations: string[];
  strengths: Array<{ manufacturerId: string; strengths: string[] }>;
  weaknesses: Array<{ manufacturerId: string; weaknesses: string[] }>;
}

/**
 * Enhanced public-facing manufacturer profile service with comprehensive features
 */
export class ManufacturerProfileService {

  /**
   * Search manufacturers with comprehensive filtering and pagination
   */
  async searchManufacturers(params: SearchOptions): Promise<SearchResult> {
    const {
      query,
      industry,
      services,
      minMoq,
      maxMoq,
      limit = 20,
      offset = 0,
      sortBy = 'name',
      sortOrder = 'asc'
    } = params;

    // Build search criteria
    const searchCriteria: any = { 
      isActive: { $ne: false },
      isEmailVerified: true 
    };

    // Text search
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { servicesOffered: { $in: [new RegExp(query, 'i')] } },
        { industry: { $regex: query, $options: 'i' } }
      ];
    }

    // Industry filter
    if (industry) {
      searchCriteria.industry = { $regex: industry, $options: 'i' };
    }

    // Services filter
    if (services && services.length > 0) {
      searchCriteria.servicesOffered = { $in: services.map(s => new RegExp(s, 'i')) };
    }

    // MOQ range filter
    if (minMoq !== undefined || maxMoq !== undefined) {
      searchCriteria.moq = {};
      if (minMoq !== undefined) searchCriteria.moq.$gte = minMoq;
      if (maxMoq !== undefined) searchCriteria.moq.$lte = maxMoq;
    }

    // Build sort criteria with plan-based ranking
    const sortCriteria: any = {};
    switch (sortBy) {
      case 'profileCompleteness':
        sortCriteria['activityMetrics.profileCompleteness'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'industry':
        sortCriteria.industry = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'moq':
        sortCriteria.moq = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'plan':
        // Sort by plan tier (unlimited > enterprise > professional > starter)
        sortCriteria.plan = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        // Default sorting: profile score first, then plan tier (more fair)
        sortCriteria.profileScore = -1; // Higher scores first
        sortCriteria.plan = -1; // Higher plans second
        sortCriteria.totalConnections = -1; // Social proof third
    }

    // Execute search with aggregations
    const [manufacturers, total, aggregations] = await Promise.all([
      Manufacturer
        .find(searchCriteria)
        .select(`
          name industry description servicesOffered moq profilePictureUrl 
          isVerified establishedYear headquarters certifications averageResponseTime
          clientSatisfactionRating activityMetrics profileScore totalConnections
          manufacturingCapabilities lastLoginAt plan
        `)
        .sort(sortCriteria)
        .skip(offset)
        .limit(limit)
        .lean(),
      Manufacturer.countDocuments(searchCriteria),
      this.getSearchAggregations(searchCriteria)
    ]);

    return {
      manufacturers: manufacturers.map(m => this.formatSearchResult(m, query)),
      total,
      aggregations
    };
  }

  /**
   * Advanced search with complex filters and scoring
   */
  async advancedSearch(criteria: AdvancedSearchCriteria, brandId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Build complex search query
    const searchQuery: any = {
      isActive: { $ne: false },
      isEmailVerified: true
    };

    // Text search across multiple fields
    if (criteria.query) {
      searchQuery.$text = { $search: criteria.query };
    }

    // Industries filter
    if (criteria.industries && criteria.industries.length > 0) {
      searchQuery.industry = { $in: criteria.industries };
    }

    // Services filter
    if (criteria.services && criteria.services.length > 0) {
      searchQuery.servicesOffered = { $in: criteria.services.map(s => new RegExp(s, 'i')) };
    }

    // MOQ range
    if (criteria.moqRange) {
      searchQuery.moq = {};
      if (criteria.moqRange.min !== undefined) searchQuery.moq.$gte = criteria.moqRange.min;
      if (criteria.moqRange.max !== undefined) searchQuery.moq.$lte = criteria.moqRange.max;
    }

    // Location filter
    if (criteria.location) {
      if (criteria.location.country) {
        searchQuery['headquarters.country'] = { $regex: criteria.location.country, $options: 'i' };
      }
      if (criteria.location.city) {
        searchQuery['headquarters.city'] = { $regex: criteria.location.city, $options: 'i' };
      }
    }

    // Certifications filter
    if (criteria.certifications && criteria.certifications.length > 0) {
      searchQuery.certifications = { $in: criteria.certifications };
    }

    // Rating filter
    if (criteria.rating?.min) {
      searchQuery.clientSatisfactionRating = { $gte: criteria.rating.min };
    }

    // Verification filter
    if (criteria.verified !== undefined) {
      searchQuery.isVerified = criteria.verified;
    }

    // Build sort criteria
    const sortCriteria = this.buildSortCriteria(criteria.sortBy, criteria.sortOrder);

    // Execute advanced search
    const manufacturers = await Manufacturer
      .find(searchQuery)
      .select(`
        name industry description servicesOffered moq profilePictureUrl 
        isVerified establishedYear headquarters certifications averageResponseTime
        clientSatisfactionRating activityMetrics profileScore totalConnections
        manufacturingCapabilities lastLoginAt connectionRequests
      `)
      .sort(sortCriteria)
      .limit(100) // Advanced search max limit
      .lean();

    // Calculate match scores and suggestions
    const results = manufacturers.map(m => this.formatSearchResult(m, criteria.query));
    const suggestions = this.generateSearchSuggestions(criteria, results);

    const executionTime = Date.now() - startTime;

    return {
      manufacturers: results,
      total: results.length,
      suggestions,
      appliedFilters: criteria,
      executionTime
    };
  }

  /**
   * Get detailed manufacturer profile with context
   */
  async getManufacturerProfile(id: string): Promise<ManufacturerProfile | null> {
    const manufacturer = await Manufacturer
      .findById(id)
      .select('-password -loginAttempts -lockUntil -passwordResetToken -twoFactorSecret')
      .lean();

    if (!manufacturer) {
      return null;
    }

    return this.formatFullProfile(manufacturer);
  }

  /**
   * Get profile context for a specific brand
   */
  async getProfileContext(manufacturerId: string, brandId?: string): Promise<ProfileContext> {
    const manufacturer = await Manufacturer.findById(manufacturerId);
    
    if (!manufacturer) {
      throw new Error('Manufacturer not found');
    }

    let connectionStatus: 'none' | 'pending' | 'connected' | 'rejected' = 'none';
    let canConnect = true;
    let lastInteraction: Date | undefined;

    if (brandId) {
      // Check if brand is already connected
      const brandSettings = await BrandSettings.findOne({ business: brandId });
      if (brandSettings && manufacturer.brands.includes(brandSettings._id)) {
        connectionStatus = 'connected';
        canConnect = false;
        lastInteraction = brandSettings.updatedAt;
      }

      // Check if manufacturer can connect to this brand
      if (connectionStatus === 'none') {
        canConnect = await this.canManufacturerConnectToBrand(manufacturerId, brandId);
      }
    }

    // Get analytics
    const analytics = {
      profileViews: manufacturer.profileViews || 0,
      connectionRequests: manufacturer.connectionRequests?.received || 0,
      responseRate: this.calculateResponseRate(manufacturer)
    };

    return {
      connectionStatus,
      canConnect,
      lastInteraction,
      analytics
    };
  }

  /**
   * Get manufacturers by industry with enhanced data
   */
  async getManufacturersByIndustry(industry: string): Promise<{
    manufacturers: ManufacturerSearchResult[];
    averageCompleteness: number;
    topServices: string[];
  }> {
    const manufacturers = await Manufacturer
      .find({ 
        industry: { $regex: industry, $options: 'i' },
        isActive: { $ne: false },
        isEmailVerified: true
      })
      .select(`
        name industry servicesOffered moq profilePictureUrl isVerified
        establishedYear headquarters certifications averageResponseTime
        clientSatisfactionRating activityMetrics profileScore
      `)
      .sort({ profileScore: -1, name: 1 })
      .lean();

    // Calculate statistics
    const completenessScores = manufacturers
      .map(m => m.activityMetrics?.profileCompleteness || 0)
      .filter(score => score > 0);
    
    const averageCompleteness = completenessScores.length > 0 
      ? completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length 
      : 0;

    // Get top services
    const allServices = manufacturers.flatMap(m => m.servicesOffered || []);
    const serviceCounts = allServices.reduce((acc, service) => {
      acc[service] = (acc[service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topServices = Object.entries(serviceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([service]) => service);

    return {
      manufacturers: manufacturers.map(m => this.formatSearchResult(m)),
      averageCompleteness: Math.round(averageCompleteness),
      topServices
    };
  }

  /**
   * Get featured manufacturers with personalization
   */
  async getFeaturedManufacturers(brandId?: string, options: {
    limit?: number;
    industry?: string;
  } = {}): Promise<{
    manufacturers: ManufacturerProfile[];
    selectionCriteria: string[];
    isPersonalized: boolean;
  }> {
    const { limit = 10, industry } = options;
    
    // Build selection criteria
    const matchCriteria: any = { 
      isActive: { $ne: false },
      isEmailVerified: true,
      profileScore: { $gte: 70 } // Only high-quality profiles
    };

    if (industry) {
      matchCriteria.industry = { $regex: industry, $options: 'i' };
    }

    // Get personalized recommendations if brand ID provided
    let isPersonalized = false;
    if (brandId) {
      const brand = await Business.findById(brandId);
      if (brand?.industry) {
        matchCriteria.industry = { $regex: brand.industry, $options: 'i' };
        isPersonalized = true;
      }
    }

    const manufacturers = await Manufacturer.aggregate([
      { $match: matchCriteria },
      {
        $addFields: {
          featuredScore: {
            $add: [
              { $multiply: ['$profileScore', 0.4] },
              { $multiply: [{ $size: { $ifNull: ['$brands', []] } }, 10] },
              { $multiply: [{ $ifNull: ['$clientSatisfactionRating', 0] }, 15] },
              { $cond: ['$isVerified', 20, 0] }
            ]
          }
        }
      },
      { $sort: { featuredScore: -1, profileScore: -1 } },
      { $limit: limit }
    ]);

    const selectionCriteria = [
      'High profile completeness score',
      'Verified manufacturers',
      'Strong client satisfaction ratings',
      'Active brand connections'
    ];

    if (isPersonalized) {
      selectionCriteria.unshift('Industry match with your business');
    }

    return {
      manufacturers: manufacturers.map(m => this.formatFullProfile(m)),
      selectionCriteria,
      isPersonalized
    };
  }

  /**
   * Get comprehensive manufacturer statistics
   */
  async getManufacturerStatistics(): Promise<ManufacturerStatistics> {
    const [globalStats, industryStats, trends, servicesStats, metricsStats] = await Promise.all([
      this.getGlobalStats(),
      this.getIndustryBreakdown(),
      this.getTrends(),
      this.getTopServices(),
      this.getAverageMetrics()
    ]);

    return {
      globalStats,
      industryBreakdown: industryStats,
      trends,
      topServices: servicesStats,
      averageMetrics: metricsStats
    };
  }

  /**
   * Compare multiple manufacturers
   */
  async compareManufacturers(manufacturerIds: string[]): Promise<ComparisonResult> {
    const manufacturers = await Manufacturer
      .find({ _id: { $in: manufacturerIds } })
      .select(`
        name industry description servicesOffered moq profilePictureUrl 
        isVerified establishedYear headquarters certifications averageResponseTime
        clientSatisfactionRating activityMetrics profileScore totalConnections
        manufacturingCapabilities employeeCount
      `)
      .lean();

    if (manufacturers.length !== manufacturerIds.length) {
      throw new Error('Some manufacturers not found');
    }

    // Build comparison matrix
    const comparisonMatrix = this.buildComparisonMatrix(manufacturers);
    
    // Generate recommendations
    const recommendations = this.generateComparisonRecommendations(manufacturers);
    
    // Identify strengths and weaknesses
    const strengths = this.identifyStrengths(manufacturers);
    const weaknesses = this.identifyWeaknesses(manufacturers);

    return {
      manufacturers: manufacturers.map(m => this.formatFullProfile(m)),
      comparisonMatrix,
      recommendations,
      strengths,
      weaknesses
    };
  }

  /**
   * Save search criteria for a brand
   */
  async saveSearch(brandId: string, searchName: string, criteria: AdvancedSearchCriteria): Promise<string> {
    // In a real implementation, you'd save to a SavedSearches collection
    // For now, return a mock ID
    const searchId = `search_${Date.now()}_${brandId.slice(-6)}`;
    
    // TODO: Implement actual search saving
    logger.info('Saving search ', ${searchName}" for brand ${brandId}:`, criteria);
    
    return searchId;
  }

  // Private helper methods

  private formatSearchResult(manufacturer: any, query?: string): ManufacturerSearchResult {
    const connectionSuccessRate = this.calculateConnectionSuccessRate(manufacturer);
    
    return {
      id: manufacturer._id.toString(),
      name: manufacturer.name,
      industry: manufacturer.industry,
      servicesOffered: manufacturer.servicesOffered || [],
      moq: manufacturer.moq,
      profilePictureUrl: manufacturer.profilePictureUrl,
      isVerified: manufacturer.isVerified || false,
      profileCompleteness: manufacturer.activityMetrics?.profileCompleteness || 0,
      profileScore: manufacturer.profileScore || 0,
      matchScore: query ? this.calculateMatchScore(manufacturer, query) : undefined,
      headquarters: manufacturer.headquarters ? {
        country: manufacturer.headquarters.country,
        city: manufacturer.headquarters.city
      } : undefined,
      establishedYear: manufacturer.establishedYear,
      certifications: manufacturer.certifications || [],
      averageResponseTime: manufacturer.averageResponseTime,
      connectionSuccessRate
    };
  }

  private formatFullProfile(manufacturer: any): ManufacturerProfile {
    return {
      id: manufacturer._id.toString(),
      name: manufacturer.name,
      industry: manufacturer.industry,
      description: manufacturer.description,
      servicesOffered: manufacturer.servicesOffered || [],
      moq: manufacturer.moq,
      profilePictureUrl: manufacturer.profilePictureUrl,
      contactEmail: manufacturer.contactEmail,
      socialUrls: manufacturer.socialUrls || [],
      website: manufacturer.website,
      connectedBrandsCount: manufacturer.totalConnections || 0,
      isVerified: manufacturer.isVerified || false,
      profileCompleteness: manufacturer.activityMetrics?.profileCompleteness || 0,
      establishedYear: manufacturer.establishedYear,
      employeeCount: manufacturer.employeeCount,
      headquarters: manufacturer.headquarters,
      certifications: manufacturer.certifications || [],
      averageResponseTime: manufacturer.averageResponseTime,
      clientSatisfactionRating: manufacturer.clientSatisfactionRating,
      manufacturingCapabilities: manufacturer.manufacturingCapabilities,
      lastActive: manufacturer.lastLoginAt,
      profileScore: manufacturer.profileScore || 0
    };
  }

  private async getSearchAggregations(searchCriteria: any): Promise<any> {
    const aggregations = await Manufacturer.aggregate([
      { $match: searchCriteria },
      {
        $group: {
          _id: null,
          industries: { $addToSet: '$industry' },
          services: { $push: '$servicesOffered' },
          averageScore: { $avg: '$profileScore' },
          verifiedCount: { $sum: { $cond: ['$isVerified', 1, 0] } }
        }
      }
    ]);

    if (aggregations.length === 0) {
      return { industries: [], services: [], averageScore: 0, verifiedCount: 0 };
    }

    const result = aggregations[0];
    const flatServices = result.services.flat().filter(Boolean);
    const uniqueServices = [...new Set(flatServices)];

    return {
      industries: result.industries.filter(Boolean),
      services: uniqueServices,
      averageScore: Math.round(result.averageScore || 0),
      verifiedCount: result.verifiedCount
    };
  }

  private buildSortCriteria(sortBy?: string, sortOrder?: string): any {
    const order = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'profileScore':
        return { profileScore: order, name: 1 };
      case 'industry':
        return { industry: order, name: 1 };
      case 'moq':
        return { moq: order, name: 1 };
      case 'established':
        return { establishedYear: order, name: 1 };
      case 'connections':
        return { totalConnections: order, name: 1 };
      default:
        return { name: order };
    }
  }

  private calculateMatchScore(manufacturer: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Name match (highest weight)
    if (manufacturer.name.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    // Services match
    if (manufacturer.servicesOffered) {
      const serviceMatches = manufacturer.servicesOffered.filter((service: string) =>
        service.toLowerCase().includes(queryLower)
      ).length;
      score += serviceMatches * 20;
    }
    
    // Industry match
    if (manufacturer.industry && manufacturer.industry.toLowerCase().includes(queryLower)) {
      score += 30;
    }
    
    // Description match
    if (manufacturer.description && manufacturer.description.toLowerCase().includes(queryLower)) {
      score += 15;
    }
    
    // Profile quality bonus
    score += (manufacturer.profileScore || 0) * 0.1;
    
    return Math.round(score);
  }

  private calculateConnectionSuccessRate(manufacturer: any): number {
    const requests = manufacturer.connectionRequests;
    if (!requests || !requests.sent || requests.sent === 0) {
      return 0;
    }
    
    return Math.round((requests.approved / requests.sent) * 100);
  }

  private calculateResponseRate(manufacturer: any): number {
    // Simplified calculation based on response time and activity
    const responseTime = manufacturer.averageResponseTime || 24;
    const baseRate = Math.max(0, 100 - (responseTime * 2));
    
    // Boost for recent activity
    const lastActive = manufacturer.lastLoginAt;
    if (lastActive && (Date.now() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      return Math.min(100, baseRate + 20);
    }
    
    return baseRate;
  }

  private async canManufacturerConnectToBrand(manufacturerId: string, brandId: string): Promise<boolean> {
    const manufacturer = await Manufacturer.findById(manufacturerId);
    const brand = await Business.findById(brandId);
    
    if (!manufacturer || !brand) {
      return false;
    }
    
    // Check if manufacturer meets minimum requirements
    if (!manufacturer.isEmailVerified || !manufacturer.isActive) {
      return false;
    }
    
    // Check profile completeness
    const completeness = manufacturer.activityMetrics?.profileCompleteness || 0;
    if (completeness < 60) {
      return false;
    }
    
    return true;
  }

  private generateSearchSuggestions(criteria: AdvancedSearchCriteria, results: ManufacturerSearchResult[]): string[] {
    const suggestions: string[] = [];
    
    if (results.length === 0) {
      suggestions.push('Try removing some filters');
      suggestions.push('Search for broader terms');
      suggestions.push('Check spelling of search terms');
    } else if (results.length < 5) {
      suggestions.push('Expand search to nearby regions');
      suggestions.push('Consider related industries');
      suggestions.push('Adjust MOQ requirements');
    }
    
    // Industry-based suggestions
    if (criteria.industries && criteria.industries.length > 0) {
      const relatedIndustries = this.getRelatedIndustries(criteria.industries[0]);
      suggestions.push(`Try related industries: ${relatedIndustries.join(', ')}`);
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private getRelatedIndustries(industry: string): string[] {
    const industryMap: Record<string, string[]> = {
      'Electronics': ['Technology', 'Hardware', 'Components'],
      'Automotive': ['Transportation', 'Machinery', 'Parts'],
      'Textiles': ['Fashion', 'Apparel', 'Materials'],
      'Food': ['Beverages', 'Agriculture', 'Packaging'],
      'Healthcare': ['Medical', 'Pharmaceuticals', 'Biotechnology']
    };
    
    return industryMap[industry] || [];
  }

  private async getGlobalStats() {
    const stats = await Manufacturer.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
          averageProfileScore: { $avg: '$profileScore' }
        }
      }
    ]);
    
    return stats[0] || { total: 0, active: 0, verified: 0, averageProfileScore: 0 };
  }

  private async getIndustryBreakdown() {
    return await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          averageScore: { $avg: '$profileScore' }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          industry: '$_id',
          count: 1,
          averageScore: { $round: ['$averageScore', 1] },
          _id: 0
        }
      }
    ]);
  }

  private async getTrends() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const newManufacturers = await Manufacturer.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: { $ne: false }
    });
    
    // Calculate growth rate (simplified)
    const totalManufacturers = await Manufacturer.countDocuments({ isActive: { $ne: false } });
    const growthRate = totalManufacturers > 0 ? (newManufacturers / totalManufacturers) * 100 : 0;
    
    return {
      newManufacturers,
      growthRate: Math.round(growthRate * 10) / 10,
      topGrowingIndustries: ['Electronics', 'Healthcare', 'Sustainability'] // Simplified
    };
  }

  private async getTopServices() {
    const result = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $unwind: '$servicesOffered' },
      {
        $group: {
          _id: '$servicesOffered',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          service: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    return result;
  }

  private async getAverageMetrics() {
    const metrics = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $group: {
          _id: null,
          moq: { $avg: '$moq' },
          responseTime: { $avg: '$averageResponseTime' },
          satisfaction: { $avg: '$clientSatisfactionRating' },
          profileCompleteness: { $avg: '$activityMetrics.profileCompleteness' }
        }
      }
    ]);
    
    const result = metrics[0] || {};
    return {
      moq: Math.round(result.moq || 0),
      responseTime: Math.round(result.responseTime || 0),
      satisfaction: Math.round((result.satisfaction || 0) * 10) / 10,
      profileCompleteness: Math.round(result.profileCompleteness || 0)
    };
  }

  private buildComparisonMatrix(manufacturers: any[]): Array<{
    metric: string;
    values: Array<{ manufacturerId: string; value: any; rank: number }>;
  }> {
    const metrics = [
      'profileScore',
      'totalConnections',
      'clientSatisfactionRating',
      'averageResponseTime',
      'establishedYear',
      'employeeCount',
      'moq'
    ];

    return metrics.map(metric => {
      const values = manufacturers.map(m => ({
        manufacturerId: m._id.toString(),
        value: this.getMetricValue(m, metric),
        rank: 0
      }));

      // Sort and assign ranks
      values.sort((a, b) => {
        if (metric === 'averageResponseTime') {
          // Lower is better for response time
          return (a.value || Infinity) - (b.value || Infinity);
        }
        // Higher is better for other metrics
        return (b.value || 0) - (a.value || 0);
      });

      values.forEach((item, index) => {
        item.rank = index + 1;
      });

      return {
        metric: this.formatMetricName(metric),
        values
      };
    });
  }

  private getMetricValue(manufacturer: any, metric: string): any {
    switch (metric) {
      case 'profileScore':
        return manufacturer.profileScore || 0;
      case 'totalConnections':
        return manufacturer.totalConnections || 0;
      case 'clientSatisfactionRating':
        return manufacturer.clientSatisfactionRating || 0;
      case 'averageResponseTime':
        return manufacturer.averageResponseTime || null;
      case 'establishedYear':
        return manufacturer.establishedYear || null;
      case 'employeeCount':
        return manufacturer.employeeCount || null;
      case 'moq':
        return manufacturer.moq || null;
      default:
        return null;
    }
  }

  private formatMetricName(metric: string): string {
    const nameMap: Record<string, string> = {
      'profileScore': 'Profile Score',
      'totalConnections': 'Total Connections',
      'clientSatisfactionRating': 'Client Satisfaction',
      'averageResponseTime': 'Response Time (hours)',
      'establishedYear': 'Established Year',
      'employeeCount': 'Employee Count',
      'moq': 'Minimum Order Quantity'
    };
    
    return nameMap[metric] || metric;
  }

  private generateComparisonRecommendations(manufacturers: any[]): string[] {
    const recommendations: string[] = [];
    
    // Find best performers in each category
    const bestProfileScore = manufacturers.reduce((max, m) => 
      (m.profileScore || 0) > (max.profileScore || 0) ? m : max
    );
    
    const bestResponseTime = manufacturers.reduce((min, m) => 
      (m.averageResponseTime || Infinity) < (min.averageResponseTime || Infinity) ? m : min
    );
    
    const bestSatisfaction = manufacturers.reduce((max, m) => 
      (m.clientSatisfactionRating || 0) > (max.clientSatisfactionRating || 0) ? m : max
    );

    recommendations.push(`${bestProfileScore.name} has the highest profile completeness`);
    
    if (bestResponseTime.averageResponseTime) {
      recommendations.push(`${bestResponseTime.name} offers the fastest response time`);
    }
    
    if (bestSatisfaction.clientSatisfactionRating) {
      recommendations.push(`${bestSatisfaction.name} has the highest client satisfaction rating`);
    }

    // Industry-specific recommendations
    const industries = [...new Set(manufacturers.map(m => m.industry).filter(Boolean))];
    if (industries.length > 1) {
      recommendations.push('Consider industry specialization when making your choice');
    }

    // MOQ recommendations
    const moqs = manufacturers.map(m => m.moq).filter(Boolean);
    if (moqs.length > 0) {
      const minMoq = Math.min(...moqs);
      const maxMoq = Math.max(...moqs);
      if (maxMoq > minMoq * 2) {
        recommendations.push('MOQ requirements vary significantly - consider your volume needs');
      }
    }

    return recommendations;
  }

  private identifyStrengths(manufacturers: any[]): Array<{ manufacturerId: string; strengths: string[] }> {
    return manufacturers.map(m => {
      const strengths: string[] = [];
      
      if ((m.profileScore || 0) >= 80) {
        strengths.push('High profile completeness');
      }
      
      if (m.isVerified) {
        strengths.push('Verified manufacturer');
      }
      
      if ((m.clientSatisfactionRating || 0) >= 4.5) {
        strengths.push('Excellent client satisfaction');
      }
      
      if ((m.averageResponseTime || 0) <= 4) {
        strengths.push('Fast response time');
      }
      
      if ((m.totalConnections || 0) >= 10) {
        strengths.push('Extensive brand network');
      }
      
      if (m.certifications && m.certifications.length >= 3) {
        strengths.push('Well-certified');
      }
      
      if (m.establishedYear && (new Date().getFullYear() - m.establishedYear) >= 10) {
        strengths.push('Established business');
      }

      return {
        manufacturerId: m._id.toString(),
        strengths
      };
    });
  }

  private identifyWeaknesses(manufacturers: any[]): Array<{ manufacturerId: string; weaknesses: string[] }> {
    return manufacturers.map(m => {
      const weaknesses: string[] = [];
      
      if ((m.profileScore || 0) < 60) {
        weaknesses.push('Low profile completeness');
      }
      
      if (!m.isVerified) {
        weaknesses.push('Unverified account');
      }
      
      if ((m.clientSatisfactionRating || 0) < 3.5) {
        weaknesses.push('Below average client satisfaction');
      }
      
      if ((m.averageResponseTime || 0) > 24) {
        weaknesses.push('Slow response time');
      }
      
      if ((m.totalConnections || 0) < 3) {
        weaknesses.push('Limited brand connections');
      }
      
      if (!m.certifications || m.certifications.length === 0) {
        weaknesses.push('No certifications listed');
      }
      
      if (!m.description || m.description.length < 100) {
        weaknesses.push('Incomplete business description');
      }

      return {
        manufacturerId: m._id.toString(),
        weaknesses
      };
    });
  }

  // Legacy methods for backward compatibility

  /**
   * Return a lightweight list of all active manufacturers.
   */
  async listManufacturerProfiles(): Promise<ManufacturerProfile[]> {
    const docs = await Manufacturer
      .find({ 
        isActive: { $ne: false },
        isEmailVerified: true 
      })
      .select('name industry description servicesOffered moq profilePictureUrl totalConnections isVerified')
      .sort({ profileScore: -1, name: 1 })
      .limit(50)
      .lean();

    return docs.map(m => ({
      id: m._id.toString(),
      name: m.name,
      industry: m.industry,
      description: m.description,
      servicesOffered: m.servicesOffered,
      moq: m.moq,
      profilePictureUrl: m.profilePictureUrl,
      connectedBrandsCount: m.totalConnections || 0,
      isVerified: m.isVerified || false
    }));
  }

  /**
   * Get available industries from all manufacturers
   */
  async getAvailableIndustries(): Promise<string[]> {
    const industries = await Manufacturer.distinct('industry', {
      industry: { $exists: true, $ne: null },
      isActive: { $ne: false }
    });

    return industries.filter(industry => industry && industry.trim() !== '');
  }

  /**
   * Get available services from all manufacturers
   */
  async getAvailableServices(): Promise<string[]> {
    const allServices = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $unwind: '$servicesOffered' },
      { $group: { _id: '$servicesOffered' } },
      { $sort: { _id: 1 } }
    ]);

    return allServices.map(service => service._id).filter(Boolean);
  }

  /**
   * Get manufacturer statistics for admin dashboard
   */
  async getManufacturerStats(): Promise<{
    total: number;
    active: number;
    byIndustry: Record<string, number>;
    averageConnections: number;
  }> {
    const [total, active, byIndustry, connectionStats] = await Promise.all([
      Manufacturer.countDocuments(),
      Manufacturer.countDocuments({ isActive: { $ne: false } }),
      Manufacturer.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } }
      ]),
      Manufacturer.aggregate([
        { $match: { isActive: { $ne: false } } },
        {
          $group: {
            _id: null,
            averageConnections: { $avg: '$totalConnections' }
          }
        }
      ])
    ]);

    const industryMap: Record<string, number> = {};
    byIndustry.forEach(item => {
      if (item._id) {
        industryMap[item._id] = item.count;
      }
    });

    return {
      total,
      active,
      byIndustry: industryMap,
      averageConnections: connectionStats[0]?.averageConnections || 0
    };
  }
}
