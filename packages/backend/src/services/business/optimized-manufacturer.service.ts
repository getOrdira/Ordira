/**
 * Optimized Manufacturer Service
 *
 * Optimized version of the manufacturer service using:
 * - Query optimization service for complex searches
 * - Enhanced caching for frequently accessed data
 * - Performance monitoring and logging
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { Manufacturer } from '../../models/manufacturer.model';
import { queryOptimizationService } from '../external/query-optimization.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';
import { UtilsService } from '../utils/utils.service';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

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
 * Optimized manufacturer service with caching and query optimization
 */
export class OptimizedManufacturerService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour
  private readonly SEARCH_CACHE_TTL = 60; // 1 minute for search results

  /**
   * Register a new manufacturer with optimized validation
   */
  async registerManufacturer(data: RegisterManufacturerData): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate input
      this.validateRegistrationData(data);

      // Check if email already exists (with caching)
      const existingManufacturer = await this.getManufacturerByEmail(data.email, true);
      if (existingManufacturer) {
        throw { statusCode: 409, message: 'Email already exists' };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Create manufacturer
      const manufacturerData = {
        ...data,
        password: hashedPassword,
        isActive: true,
        isEmailVerified: false,
        profileScore: this.calculateInitialProfileScore(data),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const manufacturer = new Manufacturer(manufacturerData);
      const savedManufacturer = await manufacturer.save();

      // Invalidate manufacturer search cache
      await this.invalidateManufacturerCaches();

      const duration = Date.now() - startTime;
      logger.info(`Manufacturer registered successfully in ${duration}ms`, {
        manufacturerId: savedManufacturer._id,
        email: data.email,
        duration
      });

      // Don't return password
      const { password, ...manufacturerResult } = savedManufacturer.toObject();
      return manufacturerResult;

    } catch (error) {
      logger.error('Failed to register manufacturer:', error);
      throw error;
    }
  }

  /**
   * Login manufacturer with optimized checks
   */
  async loginManufacturer(email: string, password: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Get manufacturer (try cache first for recent logins)
      const manufacturer = await this.getManufacturerByEmail(email);
      if (!manufacturer) {
        throw { statusCode: 401, message: 'Invalid credentials' };
      }

      if (!manufacturer.isActive) {
        throw { statusCode: 401, message: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, manufacturer.password);
      if (!isValidPassword) {
        throw { statusCode: 401, message: 'Invalid credentials' };
      }

      // Update last login
      await Manufacturer.findByIdAndUpdate(manufacturer._id, {
        lastLoginAt: new Date(),
        $inc: { loginCount: 1 }
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          manufacturerId: manufacturer._id,
          email: manufacturer.email,
          type: 'manufacturer'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Cache manufacturer data for faster subsequent requests
      await enhancedCacheService.cacheManufacturer(manufacturer._id.toString(), manufacturer, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Manufacturer login successful in ${duration}ms`, {
        manufacturerId: manufacturer._id,
        email,
        duration
      });

      // Don't return password
      const { password: _, ...manufacturerResult } = manufacturer.toObject();
      return {
        token,
        manufacturer: manufacturerResult
      };

    } catch (error) {
      logger.error('Failed to login manufacturer:', error);
      throw error;
    }
  }

  /**
   * Search manufacturers with optimization and caching
   */
  async searchManufacturers(params: ManufacturerSearchParams): Promise<any> {
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
  }

  /**
   * Get manufacturer by ID with caching
   */
  async getManufacturerById(manufacturerId: string, useCache: boolean = true): Promise<any> {
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
  }

  /**
   * Get manufacturer by email with optional caching
   */
  async getManufacturerByEmail(email: string, skipCache: boolean = false): Promise<any> {
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
   * Get manufacturer analytics with caching
   */
  async getManufacturerAnalytics(
    manufacturerId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('manufacturer', {
      manufacturerId,
      dateRange
    }, { ttl: 600 }); // 10 minutes cache

    if (cached) {
      return cached;
    }

    // Generate analytics (this would be a complex aggregation)
    const analytics = await this.generateManufacturerAnalytics(manufacturerId, dateRange);

    // Cache the result
    await enhancedCacheService.cacheAnalytics('manufacturer', {
      manufacturerId,
      dateRange
    }, analytics, { ttl: 600 });

    return analytics;
  }

  /**
   * Get manufacturers by industry with caching
   */
  async getManufacturersByIndustry(industry: string, limit: number = 20): Promise<any[]> {
    const cacheKey = `manufacturers_by_industry:${industry}:${limit}`;

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
   * Private helper methods
   */
  private validateRegistrationData(data: RegisterManufacturerData): void {
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

  private calculateInitialProfileScore(data: RegisterManufacturerData): number {
    let score = 0;

    if (data.name) score += 10;
    if (data.description) score += 15;
    if (data.industry) score += 10;
    if (data.contactEmail) score += 5;
    if (data.servicesOffered && data.servicesOffered.length > 0) score += 20;
    if (data.moq !== undefined) score += 10;
    if (data.headquarters?.country) score += 10;

    return score;
  }

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

  private async generateManufacturerAnalytics(manufacturerId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    // This would implement complex analytics aggregation
    // For now, return basic structure
    return {
      profileViews: 0,
      connectionRequests: 0,
      activeConnections: 0,
      productInquiries: 0,
      profileCompleteness: 0,
      industryRanking: 0
    };
  }

  private async invalidateManufacturerCaches(manufacturerId?: string): Promise<void> {
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
}

export const optimizedManufacturerService = new OptimizedManufacturerService();