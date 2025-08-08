// src/services/business/manufacturerProfile.service.ts

import { Manufacturer } from '../../models/manufacturer.model';

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
  connectedBrandsCount?: number;
}

export interface ManufacturerSearchResult {
  id: string;
  name: string;
  industry?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
}

/**
 * Public-facing manufacturer profile service
 */
export class ManufacturerProfileService {

  /**
   * Return a lightweight list of all active manufacturers.
   */
  async listManufacturerProfiles(): Promise<ManufacturerProfile[]> {
    const docs = await Manufacturer
      .find({ isActive: { $ne: false } })
      .select('name industry description servicesOffered moq profilePictureUrl brands')
      .sort('name')
      .lean();

    return docs.map(m => ({
      id: m._id.toString(),
      name: m.name,
      industry: m.industry,
      description: m.description,
      servicesOffered: m.servicesOffered,
      moq: m.moq,
      profilePictureUrl: m.profilePictureUrl,
      connectedBrandsCount: m.brands?.length || 0
    }));
  }

  /**
   * Fetch a single manufacturer's public profile.
   */
  async getManufacturerProfile(id: string): Promise<ManufacturerProfile> {
    const m = await Manufacturer
      .findById(id)
      .select('name industry description servicesOffered moq profilePictureUrl contactEmail socialUrls brands')
      .lean();

    if (!m) {
      throw { statusCode: 404, message: 'Manufacturer not found.' };
    }

    return {
      id: m._id.toString(),
      name: m.name,
      industry: m.industry,
      description: m.description,
      servicesOffered: m.servicesOffered,
      moq: m.moq,
      profilePictureUrl: m.profilePictureUrl,
      contactEmail: m.contactEmail,
      socialUrls: m.socialUrls,
      connectedBrandsCount: m.brands?.length || 0
    };
  }

  /**
   * Search manufacturers by various criteria
   */
  async searchManufacturers(params: {
    query?: string;
    industry?: string;
    services?: string[];
    minMoq?: number;
    maxMoq?: number;
    limit?: number;
    offset?: number;
  }): Promise<{
    manufacturers: ManufacturerSearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      query,
      industry,
      services,
      minMoq,
      maxMoq,
      limit = 20,
      offset = 0
    } = params;

    // Build search criteria
    const searchCriteria: any = { isActive: { $ne: false } };

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (industry) {
      searchCriteria.industry = industry;
    }

    if (services && services.length > 0) {
      searchCriteria.servicesOffered = { $in: services };
    }

    if (minMoq !== undefined || maxMoq !== undefined) {
      searchCriteria.moq = {};
      if (minMoq !== undefined) searchCriteria.moq.$gte = minMoq;
      if (maxMoq !== undefined) searchCriteria.moq.$lte = maxMoq;
    }

    // Execute search with pagination
    const [manufacturers, total] = await Promise.all([
      Manufacturer
        .find(searchCriteria)
        .select('name industry servicesOffered moq profilePictureUrl')
        .sort('name')
        .skip(offset)
        .limit(limit + 1) // Get one extra to check if there are more
        .lean(),
      Manufacturer.countDocuments(searchCriteria)
    ]);

    const hasMore = manufacturers.length > limit;
    if (hasMore) {
      manufacturers.pop(); // Remove the extra item
    }

    return {
      manufacturers: manufacturers.map(m => ({
        id: m._id.toString(),
        name: m.name,
        industry: m.industry,
        servicesOffered: m.servicesOffered,
        moq: m.moq,
        profilePictureUrl: m.profilePictureUrl
      })),
      total,
      hasMore
    };
  }

  /**
   * Get manufacturers by industry
   */
  async getManufacturersByIndustry(industry: string): Promise<ManufacturerSearchResult[]> {
    const manufacturers = await Manufacturer
      .find({ 
        industry,
        isActive: { $ne: false }
      })
      .select('name industry servicesOffered moq profilePictureUrl')
      .sort('name')
      .lean();

    return manufacturers.map(m => ({
      id: m._id.toString(),
      name: m.name,
      industry: m.industry,
      servicesOffered: m.servicesOffered,
      moq: m.moq,
      profilePictureUrl: m.profilePictureUrl
    }));
  }

  /**
   * Get featured manufacturers (highest connected brands count)
   */
  async getFeaturedManufacturers(limit: number = 10): Promise<ManufacturerProfile[]> {
    const manufacturers = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $addFields: {
          brandsCount: { $size: { $ifNull: ['$brands', []] } }
        }
      },
      { $sort: { brandsCount: -1, name: 1 } },
      { $limit: limit },
      {
        $project: {
          name: 1,
          industry: 1,
          description: 1,
          servicesOffered: 1,
          moq: 1,
          profilePictureUrl: 1,
          connectedBrandsCount: '$brandsCount'
        }
      }
    ]);

    return manufacturers.map(m => ({
      id: m._id.toString(),
      name: m.name,
      industry: m.industry,
      description: m.description,
      servicesOffered: m.servicesOffered,
      moq: m.moq,
      profilePictureUrl: m.profilePictureUrl,
      connectedBrandsCount: m.connectedBrandsCount
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
          $project: {
            brandsCount: { $size: { $ifNull: ['$brands', []] } }
          }
        },
        {
          $group: {
            _id: null,
            averageConnections: { $avg: '$brandsCount' }
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
