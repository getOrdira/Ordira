// src/services/manufacturers/core/manufacturerData.service.ts

import { logger } from '../../../utils/logger';
import { Manufacturer } from '../../../models/manufacturer.model';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { queryOptimizationService } from '../../external/query-optimization.service';

export interface ManufacturerSearchParams {
  query?: string;
  industry?: string;
  services?: string[];
  minMoq?: number;
  maxMoq?: number;
  location?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RegisterManufacturerData {
  name: string;
  email: string;
  password: string;
  industry?: string;
  contactEmail?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
}

export interface UpdateManufacturerData {
  name?: string;
  description?: string;
  industry?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: Date;
    expiryDate?: Date;
  }>;
}

/**
 * Core manufacturer data service - handles basic CRUD operations with optimization
 * Extracted from original manufacturer.service.ts
 */
export class ManufacturerDataService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly SEARCH_CACHE_TTL = 60; // 1 minute for search results

  /**
   * Search manufacturers with optimization and caching
   */
  async searchManufacturers(params: ManufacturerSearchParams): Promise<any> {
    try {
      // Try to get from cache first
      const cachedResult = await enhancedCacheService.getCachedManufacturerSearch(params, {
        ttl: this.SEARCH_CACHE_TTL
      });

      if (cachedResult) {
        logger.info('Manufacturer search served from cache', {
          params: Object.keys(params),
          resultsCount: cachedResult.manufacturers?.length || 0
        });
        return cachedResult;
      }

      // Use optimized query service
      const result = await queryOptimizationService.optimizedManufacturerSearch(params, Manufacturer);

      // Cache the result
      await enhancedCacheService.cacheManufacturerSearch(params, result, {
        ttl: this.SEARCH_CACHE_TTL
      });

      return result;
    } catch (error) {
      logger.error('Error searching manufacturers:', error);
      throw error;
    }
  }

  /**
   * Get manufacturer by ID with caching
   */
  async getManufacturerById(manufacturerId: string, useCache: boolean = true): Promise<any> {
    try {
      if (useCache) {
        // Try cache first
        const cached = await enhancedCacheService.getCachedManufacturer(manufacturerId);
        if (cached) {
          return cached;
        }
      }

      const manufacturer = await Manufacturer.findById(manufacturerId)
        .select('-password')
        .lean();

      if (!manufacturer) {
        return null;
      }

      // Cache the result
      if (useCache) {
        await enhancedCacheService.cacheManufacturer(manufacturerId, manufacturer, {
          ttl: this.CACHE_TTL
        });
      }

      return manufacturer;
    } catch (error) {
      logger.error('Error getting manufacturer by ID:', error);
      throw error;
    }
  }

  /**
   * Get manufacturer by email with optional caching
   */
  async getManufacturerByEmail(email: string, skipCache: boolean = false): Promise<any> {
    try {
      if (!skipCache) {
        // Try cache first (using email as key)
        const cached = await enhancedCacheService.getCachedManufacturer(`email:${email}`);
        if (cached) {
          return cached;
        }
      }

      const manufacturer = await Manufacturer.findOne({ email }).lean();

      if (!manufacturer) {
        return null;
      }

      // Cache the result (with email key for login optimization)
      if (!skipCache) {
        await enhancedCacheService.cacheManufacturer(`email:${email}`, manufacturer, {
          ttl: this.CACHE_TTL
        });
      }

      return manufacturer;
    } catch (error) {
      logger.error('Error getting manufacturer by email:', error);
      throw error;
    }
  }

  /**
   * Update manufacturer profile with cache invalidation
   */
  async updateManufacturerProfile(
    manufacturerId: string,
    updates: UpdateManufacturerData
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Calculate new profile score
      const currentManufacturer = await this.getManufacturerById(manufacturerId, false);
      if (!currentManufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      const updatedData = {
        ...updates,
        profileScore: this.calculateProfileScore({ ...currentManufacturer, ...updates }),
        updatedAt: new Date()
      };

      const manufacturer = await Manufacturer.findByIdAndUpdate(
        manufacturerId,
        { $set: updatedData },
        { new: true, runValidators: true }
      )
      .select('-password')
      .lean();

      if (!manufacturer) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      // Invalidate caches
      await this.invalidateManufacturerCaches(manufacturerId);

      const duration = Date.now() - startTime;
      logger.info(`Manufacturer profile updated successfully in ${duration}ms`, {
        manufacturerId,
        duration
      });

      return manufacturer;

    } catch (error) {
      logger.error('Failed to update manufacturer profile:', error);
      throw error;
    }
  }

  /**
   * Get manufacturers by industry with caching
   */
  async getManufacturersByIndustry(industry: string, limit: number = 20): Promise<any[]> {
    try {
      // Try cache first
      const cached = await enhancedCacheService.getCachedManufacturerSearch({ industry, limit });
      if (cached) {
        return cached.manufacturers || [];
      }

      const manufacturers = await Manufacturer.find({
        industry,
        isActive: { $ne: false },
        isEmailVerified: true
      })
      .select('name email industry description servicesOffered profileScore isVerified')
      .sort({ profileScore: -1 })
      .limit(limit)
      .lean();

      // Cache the result
      await enhancedCacheService.cacheManufacturerSearch({ industry, limit }, { manufacturers }, {
        ttl: this.CACHE_TTL
      });

      return manufacturers;
    } catch (error) {
      logger.error('Error getting manufacturers by industry:', error);
      throw error;
    }
  }

  /**
   * Delete manufacturer with cache invalidation
   */
  async deleteManufacturer(manufacturerId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await Manufacturer.deleteOne({ _id: manufacturerId });

      if (result.deletedCount === 0) {
        throw { statusCode: 404, message: 'Manufacturer not found' };
      }

      // Invalidate all related caches
      await this.invalidateManufacturerCaches(manufacturerId);

      const duration = Date.now() - startTime;
      logger.info(`Manufacturer deleted successfully in ${duration}ms`, {
        manufacturerId,
        duration
      });

    } catch (error) {
      logger.error('Failed to delete manufacturer:', error);
      throw error;
    }
  }

  /**
   * Check if manufacturer exists
   */
  async manufacturerExists(manufacturerId: string): Promise<boolean> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId).select('isActive');
      return !!(manufacturer && manufacturer.isActive !== false);
    } catch (error) {
      logger.error('Error checking manufacturer existence:', error);
      return false;
    }
  }

  /**
   * Get basic manufacturer info (lightweight)
   */
  async getManufacturerBasicInfo(manufacturerId: string): Promise<{
    name: string;
    industry?: string;
    profilePictureUrl?: string;
    isVerified?: boolean;
  } | null> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId)
        .select('name industry profilePictureUrl isVerified')
        .lean();

      if (!manufacturer) {
        return null;
      }

      return {
        name: manufacturer.name,
        industry: manufacturer.industry,
        profilePictureUrl: manufacturer.profilePictureUrl,
        isVerified: manufacturer.isVerified
      };
    } catch (error) {
      logger.error('Error getting manufacturer basic info:', error);
      throw error;
    }
  }

  /**
   * Bulk get manufacturers by IDs
   */
  async getManufacturersByIds(manufacturerIds: string[]): Promise<any[]> {
    try {
      const manufacturers = await Manufacturer.find({
        _id: { $in: manufacturerIds },
        isActive: { $ne: false }
      })
      .select('name email industry description servicesOffered profileScore isVerified profilePictureUrl')
      .lean();

      return manufacturers;
    } catch (error) {
      logger.error('Error getting manufacturers by IDs:', error);
      throw error;
    }
  }

  /**
   * Get manufacturer count by criteria
   */
  async getManufacturerCount(criteria: any = {}): Promise<number> {
    try {
      const defaultCriteria = {
        isActive: { $ne: false },
        ...criteria
      };

      return await Manufacturer.countDocuments(defaultCriteria);
    } catch (error) {
      logger.error('Error getting manufacturer count:', error);
      throw error;
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Calculate profile score based on completeness
   */
  private calculateProfileScore(manufacturerData: any): number {
    let score = 0;

    if (manufacturerData.name) score += 10;
    if (manufacturerData.description && manufacturerData.description.length > 50) score += 15;
    if (manufacturerData.industry) score += 10;
    if (manufacturerData.contactEmail) score += 5;
    if (manufacturerData.servicesOffered && manufacturerData.servicesOffered.length > 0) score += 20;
    if (manufacturerData.moq !== undefined) score += 10;
    if (manufacturerData.headquarters?.country) score += 10;
    if (manufacturerData.certifications && manufacturerData.certifications.length > 0) score += 15;
    if (manufacturerData.isEmailVerified) score += 5;

    return score;
  }

  /**
   * Invalidate manufacturer-related caches
   */
  private async invalidateManufacturerCaches(manufacturerId?: string): Promise<void> {
    try {
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
    } catch (error) {
      logger.warn('Error invalidating manufacturer caches:', error);
    }
  }
}

export const manufacturerDataCoreService = new ManufacturerDataService();