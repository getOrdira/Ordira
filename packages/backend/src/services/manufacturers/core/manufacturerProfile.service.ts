// src/services/manufacturers/core/manufacturerProfile.service.ts

import { Manufacturer } from '../../../models/deprecated/manufacturer.model';
import { logger } from '../../../utils/logger';
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/deprecated/brandSettings.model';

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

/**
 * Core manufacturer profile service - handles public-facing profile operations
 * Extracted core profile functions from original manufacturerProfile.service.ts
 */
export class ManufacturerProfileService {

  /**
   * Search manufacturers with basic filtering and pagination
   */
  async searchManufacturers(params: SearchOptions): Promise<SearchResult> {
    try {
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

      // Build sort criteria
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
          sortCriteria.plan = sortOrder === 'desc' ? -1 : 1;
          break;
        default:
          // Default sorting: profile score first, then plan tier
          sortCriteria.profileScore = -1;
          sortCriteria.plan = -1;
          sortCriteria.totalConnections = -1;
      }

      // Execute search
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
    } catch (error) {
      logger.error('Error searching manufacturers:', error);
      throw error;
    }
  }

  /**
   * Get detailed manufacturer profile with context
   */
  async getManufacturerProfile(id: string): Promise<ManufacturerProfile | null> {
    try {
      const manufacturer = await Manufacturer
        .findById(id)
        .select('-password -loginAttempts -lockUntil -passwordResetToken -twoFactorSecret')
        .lean();

      if (!manufacturer) {
        return null;
      }

      return this.formatFullProfile(manufacturer);
    } catch (error) {
      logger.error('Error getting manufacturer profile:', error);
      throw error;
    }
  }

  /**
   * Get profile context for a specific brand
   */
  async getProfileContext(manufacturerId: string, brandId?: string): Promise<ProfileContext> {
    try {
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
    } catch (error) {
      logger.error('Error getting profile context:', error);
      throw error;
    }
  }

  /**
   * Get manufacturers by industry with enhanced data
   */
  async getManufacturersByIndustry(industry: string): Promise<{
    manufacturers: ManufacturerSearchResult[];
    averageCompleteness: number;
    topServices: string[];
  }> {
    try {
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
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([service]) => service);

      return {
        manufacturers: manufacturers.map(m => this.formatSearchResult(m)),
        averageCompleteness: Math.round(averageCompleteness),
        topServices
      };
    } catch (error) {
      logger.error('Error getting manufacturers by industry:', error);
      throw error;
    }
  }

  /**
   * Get available industries from all manufacturers
   */
  async getAvailableIndustries(): Promise<string[]> {
    try {
      const industries = await Manufacturer.distinct('industry', {
        industry: { $exists: true, $ne: null },
        isActive: { $ne: false }
      });

      return industries.filter(industry => industry && industry.trim() !== '');
    } catch (error) {
      logger.error('Error getting available industries:', error);
      throw error;
    }
  }

  /**
   * Get available services from all manufacturers
   */
  async getAvailableServices(): Promise<string[]> {
    try {
      const allServices = await Manufacturer.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $unwind: '$servicesOffered' },
        { $group: { _id: '$servicesOffered' } },
        { $sort: { _id: 1 } }
      ]);

      return allServices.map(service => service._id).filter(Boolean);
    } catch (error) {
      logger.error('Error getting available services:', error);
      throw error;
    }
  }

  /**
   * Return a lightweight list of all active manufacturers
   */
  async listManufacturerProfiles(): Promise<ManufacturerProfile[]> {
    try {
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
    } catch (error) {
      logger.error('Error listing manufacturer profiles:', error);
      throw error;
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Format search result
   */
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

  /**
   * Format full profile
   */
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

  /**
   * Get search aggregations
   */
  private async getSearchAggregations(searchCriteria: any): Promise<any> {
    try {
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
    } catch (error) {
      logger.warn('Error getting search aggregations:', error);
      return { industries: [], services: [], averageScore: 0, verifiedCount: 0 };
    }
  }

  /**
   * Calculate match score
   */
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

  /**
   * Calculate connection success rate
   */
  private calculateConnectionSuccessRate(manufacturer: any): number {
    const requests = manufacturer.connectionRequests;
    if (!requests || !requests.sent || requests.sent === 0) {
      return 0;
    }

    return Math.round((requests.approved / requests.sent) * 100);
  }

  /**
   * Calculate response rate
   */
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

  /**
   * Check if manufacturer can connect to brand
   */
  private async canManufacturerConnectToBrand(manufacturerId: string, brandId: string): Promise<boolean> {
    try {
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
    } catch (error) {
      logger.error('Error checking manufacturer brand connection capability:', error);
      return false;
    }
  }
}

export const manufacturerProfileCoreService = new ManufacturerProfileService();