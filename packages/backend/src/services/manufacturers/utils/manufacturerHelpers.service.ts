/**
 * Manufacturer Helpers Service
 *
 * Contains validation and utility functions for manufacturer operations
 */

import { UtilsService } from '../../infrastructure/shared';
import { RegisterManufacturerData, UpdateManufacturerData } from '../core/manufacturerData.service';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';

export class ManufacturerHelpersService {
  /**
   * Validate manufacturer registration data
   */
  validateRegistrationData(data: RegisterManufacturerData): void {
    if (!UtilsService.isValidEmail(data.email)) {
      throw { statusCode: 400, message: 'Invalid email format' };
    }

    if (!data.name || data.name.trim().length < 2) {
      throw { statusCode: 400, message: 'Name must be at least 2 characters long' };
    }

    if (!data.password || data.password.length < 8) {
      throw { statusCode: 400, message: 'Password must be at least 8 characters long' };
    }

    if (data.contactEmail && !UtilsService.isValidEmail(data.contactEmail)) {
      throw { statusCode: 400, message: 'Invalid contact email format' };
    }
  }

  /**
   * Validate manufacturer update data
   */
  validateUpdateData(updates: UpdateManufacturerData): void {
    if (updates.name && updates.name.trim().length < 2) {
      throw { statusCode: 400, message: 'Name must be at least 2 characters long' };
    }

    if (updates.contactEmail && !UtilsService.isValidEmail(updates.contactEmail)) {
      throw { statusCode: 400, message: 'Invalid contact email format' };
    }

    if (updates.moq !== undefined && updates.moq < 0) {
      throw { statusCode: 400, message: 'MOQ must be a positive number' };
    }
  }

  /**
   * Generate manufacturer analytics data
   */
  async generateManufacturerAnalytics(
    manufacturerId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    // This would implement complex analytics aggregation
    // For now, return basic structure that can be expanded
    return {
      profileViews: 0,
      connectionRequests: 0,
      activeConnections: 0,
      productInquiries: 0,
      profileCompleteness: 0,
      industryRanking: 0
    };
  }

  /**
   * Invalidate all caches related to a manufacturer
   */
  async invalidateManufacturerCaches(manufacturerId?: string): Promise<void> {
    const tags = ['manufacturer_search', 'manufacturer_analytics'];

    if (manufacturerId) {
      tags.push(`manufacturer:${manufacturerId}`);

      // Also invalidate email-based cache
      const manufacturer = await Manufacturer.findById(manufacturerId).select('email').lean();
      if (manufacturer) {
        await enhancedCacheService.invalidateByTags([`email:${manufacturer.email}`]);
      }
    }

    await enhancedCacheService.invalidateByTags(tags);
  }

  /**
   * Format manufacturer data for public display
   */
  formatManufacturerForPublic(manufacturer: any): any {
    return {
      id: manufacturer._id || manufacturer.id,
      name: manufacturer.name,
      description: manufacturer.description,
      industry: manufacturer.industry,
      servicesOffered: manufacturer.servicesOffered,
      moq: manufacturer.moq,
      headquarters: manufacturer.headquarters,
      certifications: manufacturer.certifications,
      profileScore: manufacturer.profileScore,
      isVerified: manufacturer.isVerified,
      createdAt: manufacturer.createdAt
    };
  }

  /**
   * Check if manufacturer profile is complete
   */
  isProfileComplete(manufacturer: any): boolean {
    const requiredFields = [
      'name',
      'description',
      'industry',
      'contactEmail',
      'servicesOffered',
      'moq',
      'headquarters'
    ];

    return requiredFields.every(field => {
      const value = manufacturer[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      return value !== undefined && value !== null && value !== '';
    });
  }

  /**
   * Sanitize manufacturer search parameters
   */
  sanitizeSearchParams(params: any): any {
    const sanitized: any = {};

    if (params.query) {
      sanitized.query = params.query.trim();
    }

    if (params.industry) {
      sanitized.industry = params.industry.trim();
    }

    if (params.services && Array.isArray(params.services)) {
      sanitized.services = params.services.filter(s => s && s.trim());
    }

    if (params.minMoq !== undefined) {
      sanitized.minMoq = Math.max(0, parseInt(params.minMoq, 10) || 0);
    }

    if (params.maxMoq !== undefined) {
      sanitized.maxMoq = Math.max(0, parseInt(params.maxMoq, 10) || 0);
    }

    if (params.location) {
      sanitized.location = params.location.trim();
    }

    if (params.limit) {
      sanitized.limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 20));
    } else {
      sanitized.limit = 20;
    }

    if (params.offset) {
      sanitized.offset = Math.max(0, parseInt(params.offset, 10) || 0);
    } else {
      sanitized.offset = 0;
    }

    if (params.sortBy) {
      sanitized.sortBy = params.sortBy;
    }

    if (params.sortOrder) {
      sanitized.sortOrder = ['asc', 'desc'].includes(params.sortOrder) ? params.sortOrder : 'desc';
    }

    return sanitized;
  }
}

export const manufacturerHelpersService = new ManufacturerHelpersService();

