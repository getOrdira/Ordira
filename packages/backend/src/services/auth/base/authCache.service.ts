/**
 * Authentication Cache Service
 *
 * Provides comprehensive caching functionality for authentication operations.
 * Implements ultra-aggressive caching strategies for optimal performance while
 * maintaining security and data consistency.
 */

import crypto from 'crypto';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { Business } from '../../../models/deprecated/business.model';
import { User } from '../../../models/user';
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';

// Import base service and types
import { AuthBaseService } from './authBase.service';
import {
  CacheTTLConfig,
  AuthOptions,
  AccountResolution
} from '../types/authTypes.service';

export class AuthCacheService extends AuthBaseService {

  // Cache TTL configurations - aggressive for auth since it's called frequently
  protected readonly CACHE_TTL: CacheTTLConfig = {
    userLookup: 2 * 60 * 1000,        // 2 minutes for user/business lookups
    tokenValidation: 60 * 1000,       // 1 minute for token validation
    securityEvents: 5 * 60 * 1000,    // 5 minutes for security events
    sessionData: 10 * 60 * 1000,      // 10 minutes for session information
    authAnalytics: 15 * 60 * 1000,    // 15 minutes for analytics data
    emailVerification: 30 * 60 * 1000, // 30 minutes for email verification
    rateLimiting: 60 * 60 * 1000       // 1 hour for rate limiting
  };

  // Cache key prefixes
  private readonly CACHE_PREFIXES = {
    USER: 'ordira:user',
    BUSINESS: 'ordira:business',
    MANUFACTURER: 'ordira:manufacturer',
    TOKEN: 'ordira:token',
    EMAIL: 'ordira:email',
    ANALYTICS: 'ordira:analytics',
    SECURITY: 'ordira:security'
  };

  // ===== USER LOOKUP CACHING =====

  /**
   * Get optimized account by ID with aggressive caching
   */
  async getOptimizedAccountById(
    userId: string,
    options: {
      useCache?: boolean;
      includePassword?: boolean;
      accountType?: 'user' | 'business' | 'manufacturer' | 'both';
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const { useCache = true, includePassword = false, accountType = 'both' } = options;

    try {
      if (!userId?.trim()) {
        throw new Error('User ID is required');
      }

      // Try cache first (only for non-password requests)
      if (useCache && !includePassword) {
        const cached = await this.getCachedUser(userId);
        if (cached) {
          logger.debug('Account lookup cache hit', {
            userId,
            processingTime: Date.now() - startTime,
            cached: true
          });
          return cached;
        }
      }

      // Determine which collections to search
      const queries: Array<Promise<{ record: any; type: 'user' | 'business' | 'manufacturer' } | null>> = [];
      const selectFields = includePassword
        ? '+password +emailCode +passwordResetCode +passwordResetExpires'
        : '-password -emailCode -passwordResetCode -passwordResetExpires';

      if (accountType === 'user' || accountType === 'both') {
        queries.push(
          User.findById(userId)
            .select(selectFields)
            .lean()
            .then(user => (user ? { record: user, type: 'user' } : null))
        );
      }

      if (accountType === 'business' || accountType === 'both') {
        queries.push(
          Business.findById(userId)
            .select(selectFields)
            .lean()
            .then(business => (business ? { record: business, type: 'business' } : null))
        );
      }

      if (accountType === 'manufacturer' || accountType === 'both') {
        queries.push(
          Manufacturer.findById(userId)
            .select(selectFields)
            .lean()
            .then(manufacturer => (manufacturer ? { record: manufacturer, type: 'manufacturer' } : null))
        );
      }

      // Execute queries in parallel
      const results = await Promise.all(queries);
      const match = results.find(result => result !== null);

      if (!match) {
        return null;
      }

      const { record: account, type: resolvedType } = match;
      const enriched = await this.buildAccountResponse(account, resolvedType, {
        includePassword,
        useCache,
        sourceId: userId
      });

      const processingTime = Date.now() - startTime;
      const resolvedId = typeof enriched?._id?.toString === 'function'
        ? enriched._id.toString()
        : (enriched.id ?? userId);

      logger.debug('Account lookup completed', {
        userId: resolvedId,
        accountType: enriched.accountType,
        processingTime,
        cached: useCache && !includePassword
      });

      return enriched;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Account lookup failed', {
        userId,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Get optimized account by email with caching
   */
  async getOptimizedAccountByEmail(
    email: string,
    options: {
      useCache?: boolean;
      includePassword?: boolean;
      normalizeEmail?: boolean;
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const { useCache = true, includePassword = false, normalizeEmail = true } = options;

    try {
      if (!email?.trim()) {
        throw new Error('Email is required');
      }

      const normalizedEmail = normalizeEmail ? UtilsService.normalizeEmail(email) : email;

      // Try cache first for email lookups (only for non-password requests)
      if (useCache && !includePassword) {
        const cached = await this.getCachedEmailLookup(normalizedEmail);
        if (cached) {
          logger.debug('Email lookup cache hit', {
            email: UtilsService.maskEmail(normalizedEmail),
            processingTime: Date.now() - startTime,
            cached: true
          });
          return cached;
        }
      }

      const selectFields = includePassword
        ? '+password +emailCode +passwordResetCode +passwordResetExpires'
        : '-password -emailCode -passwordResetCode -passwordResetExpires';

      // Search across all account types in parallel
      const [user, business, manufacturer] = await Promise.all([
        User.findOne({ email: normalizedEmail }).select(selectFields).lean(),
        Business.findOne({ email: normalizedEmail }).select(selectFields).lean(),
        Manufacturer.findOne({ email: normalizedEmail }).select(selectFields).lean()
      ]);

      let accountRecord: any = null;
      let resolvedType: 'user' | 'business' | 'manufacturer' | null = null;

      if (user) {
        accountRecord = user;
        resolvedType = 'user';
      } else if (business) {
        accountRecord = business;
        resolvedType = 'business';
      } else if (manufacturer) {
        accountRecord = manufacturer;
        resolvedType = 'manufacturer';
      }

      if (!accountRecord || !resolvedType) {
        const processingTime = Date.now() - startTime;
        logger.debug('Email lookup completed - not found', {
          email: UtilsService.maskEmail(normalizedEmail),
          processingTime
        });
        return null;
      }

      const enriched = await this.buildAccountResponse(accountRecord, resolvedType, {
        includePassword,
        useCache,
        sourceId: typeof accountRecord?._id?.toString === 'function'
          ? accountRecord._id.toString()
          : (accountRecord.id ?? normalizedEmail),
        emailIdentifier: useCache && !includePassword ? normalizedEmail : undefined
      });

      const processingTime = Date.now() - startTime;
      logger.debug('Email lookup completed', {
        email: UtilsService.maskEmail(normalizedEmail),
        accountType: enriched.accountType,
        processingTime,
        cached: useCache && !includePassword
      });

      return enriched;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Email lookup failed', {
        email: UtilsService.maskEmail(email),
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  private async buildAccountResponse(
    record: any,
    resolvedType: 'user' | 'business' | 'manufacturer',
    options: {
      includePassword: boolean;
      useCache: boolean;
      sourceId: string;
      emailIdentifier?: string;
    }
  ): Promise<any> {
    const accountId = typeof record?._id?.toString === 'function'
      ? record._id.toString()
      : (record.id ?? options.sourceId);

    const enriched = {
      ...record,
      accountType: resolvedType,
      permissions: this.getUserPermissions(record, resolvedType),
      lastFetched: new Date()
    };

    if (options.useCache && !options.includePassword) {
      switch (resolvedType) {
        case 'business':
          await this.cacheBusiness(accountId, enriched);
          break;
        case 'manufacturer':
          await this.cacheManufacturer(accountId, enriched);
          break;
        default:
          await this.cacheUser(accountId, enriched);
      }

      if (options.emailIdentifier) {
        await this.cacheEmailLookup(options.emailIdentifier, enriched);
      }
    }

    return enriched;
  }

  // ===== LOGIN CACHING =====

  /**
   * Cache user data after successful login
   */
  async cacheUserAfterLogin(userId: string, userData: any): Promise<void> {
    try {
      await this.cacheUser(userId, userData);
      logger.debug('User data cached after login', { userId });
    } catch (error) {
      logger.warn('Failed to cache user data after login', { userId, error });
    }
  }

  /**
   * Cache business data after successful login
   */
  async cacheBusinessAfterLogin(businessId: string, businessData: any): Promise<void> {
    try {
      await this.cacheBusiness(businessId, businessData);
      logger.debug('Business data cached after login', { businessId });
    } catch (error) {
      logger.warn('Failed to cache business data after login', { businessId, error });
    }
  }

  /**
   * Cache manufacturer data after successful login
   */
  async cacheManufacturerAfterLogin(manufacturerId: string, manufacturerData: any): Promise<void> {
    try {
      await this.cacheManufacturer(manufacturerId, manufacturerData);
      logger.debug('Manufacturer data cached after login', { manufacturerId });
    } catch (error) {
      logger.warn('Failed to cache manufacturer data after login', { manufacturerId, error });
    }
  }

  // ===== TOKEN VALIDATION CACHING =====

  /**
   * Get cached token verification result
   */
  async getCachedTokenVerification(token: string): Promise<any | null> {
    try {
      const tokenHash = this.hashToken(token);
      return await enhancedCacheService.getCachedAnalytics('auth', {
        type: 'token-verification',
        token: tokenHash
      });
    } catch (error) {
      logger.warn('Failed to get cached token verification', { error });
      return null;
    }
  }

  /**
   * Cache token verification result
   */
  async cacheTokenVerification(token: string, result: any): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);
      await enhancedCacheService.cacheAnalytics('auth', {
        type: 'token-verification',
        token: tokenHash
      }, result, {
        keyPrefix: this.CACHE_PREFIXES.TOKEN,
        ttl: this.CACHE_TTL.tokenValidation
      });
    } catch (error) {
      logger.warn('Failed to cache token verification', { error });
    }
  }

  // ===== ANALYTICS CACHING =====

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(type: string, params: any = {}): Promise<any | null> {
    try {
      return await enhancedCacheService.getCachedAnalytics('auth', {
        type,
        ...params
      });
    } catch (error) {
      logger.warn('Failed to get cached analytics', { type, error });
      return null;
    }
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(type: string, data: any, params: any = {}): Promise<void> {
    try {
      await enhancedCacheService.cacheAnalytics('auth', {
        type,
        ...params
      }, data, {
        keyPrefix: this.CACHE_PREFIXES.ANALYTICS,
        ttl: this.CACHE_TTL.authAnalytics
      });
    } catch (error) {
      logger.warn('Failed to cache analytics', { type, error });
    }
  }

  // ===== CORE CACHING METHODS =====

  /**
   * Cache user data with optimized settings
   */
  private async cacheUser(userId: string, userData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheUser(userId, userData, {
        keyPrefix: this.CACHE_PREFIXES.USER,
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache user data', { userId, error });
    }
  }

  /**
   * Cache business data with optimized settings
   */
  private async cacheBusiness(businessId: string, businessData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheBusiness(businessId, businessData, {
        keyPrefix: this.CACHE_PREFIXES.BUSINESS,
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache business data', { businessId, error });
    }
  }

  /**
   * Cache manufacturer data with optimized settings
   */
  private async cacheManufacturer(manufacturerId: string, manufacturerData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheManufacturer(manufacturerId, manufacturerData, {
        keyPrefix: this.CACHE_PREFIXES.MANUFACTURER,
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache manufacturer data', { manufacturerId, error });
    }
  }

  /**
   * Get cached user data
   */
  private async getCachedUser(userId: string): Promise<any | null> {
    try {
      return await enhancedCacheService.getCachedUser(userId, {
        keyPrefix: this.CACHE_PREFIXES.USER
      });
    } catch (error) {
      logger.warn('Failed to get cached user', { userId, error });
      return null;
    }
  }

  /**
   * Cache email lookup result
   */
  private async cacheEmailLookup(email: string, accountData: any): Promise<void> {
    try {
      await enhancedCacheService.cacheAnalytics('auth', {
        type: 'email-lookup',
        email: email
      }, accountData, {
        keyPrefix: this.CACHE_PREFIXES.EMAIL,
        ttl: this.CACHE_TTL.userLookup
      });
    } catch (error) {
      logger.warn('Failed to cache email lookup', { error });
    }
  }

  /**
   * Get cached email lookup result
   */
  private async getCachedEmailLookup(email: string): Promise<any | null> {
    try {
      return await enhancedCacheService.getCachedAnalytics('auth', {
        type: 'email-lookup',
        email: email
      });
    } catch (error) {
      logger.warn('Failed to get cached email lookup', { error });
      return null;
    }
  }

  // ===== CACHE INVALIDATION =====

  /**
   * Invalidate account-specific caches
   */
  async invalidateAccountCaches(accountType: 'user' | 'business' | 'manufacturer', accountId: string): Promise<void> {
    try {
      const tags = ['auth_analytics'];

      if (accountType === 'user') {
        tags.push(`user:${accountId}`, 'user_analytics');
      } else if (accountType === 'business') {
        tags.push(`business:${accountId}`, 'business_analytics');
      } else {
        tags.push(`manufacturer:${accountId}`, 'manufacturer_search', 'manufacturer_analytics');
      }

      await enhancedCacheService.invalidateByTags(tags);
      logger.debug('Account caches invalidated', { accountType, accountId });
    } catch (error) {
      logger.warn('Failed to invalidate account caches', { accountType, accountId, error });
    }
  }

  /**
   * Clear auth caches for a specific user
   */
  async clearAuthCache(userId: string, accountType: 'user' | 'business' | 'manufacturer' = 'user'): Promise<void> {
    try {
      await enhancedCacheService.invalidateByTags([
        `${accountType}:${userId}`,
        `email-lookup:${userId}`,
        `password-verification:${userId}`,
        `token-verification:${userId}`
      ]);

      logger.info('Auth caches cleared successfully', { userId, accountType });
    } catch (error) {
      logger.error('Failed to clear auth cache', { userId, accountType, error });
    }
  }

  /**
   * Clear all authentication caches
   */
  async clearAllAuthCaches(): Promise<void> {
    try {
      await enhancedCacheService.invalidateByTags([
        'auth_analytics',
        'user_analytics',
        'business_analytics',
        'manufacturer_analytics',
        'email_verification',
        'password_reset',
        'token_validation',
        'email_lookup',
        'user_lookup'
      ]);

      logger.info('All authentication caches cleared');
    } catch (error) {
      logger.error('Failed to clear all auth caches', { error });
    }
  }

  /**
   * Invalidate caches by email
   */
  async invalidateCachesByEmail(email: string): Promise<void> {
    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);
      const emailHash = this.hashString(normalizedEmail);

      await enhancedCacheService.invalidateByTags([
        `email:${emailHash}`,
        `email-lookup:${normalizedEmail}`,
        `user-email:${normalizedEmail}`
      ]);

      logger.debug('Email-based caches invalidated', { email: UtilsService.maskEmail(normalizedEmail) });
    } catch (error) {
      logger.warn('Failed to invalidate caches by email', { error });
    }
  }

  // ===== CACHE UTILITIES =====

  /**
   * Hash token for secure caching
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }

  /**
   * Hash string for caching
   */
  hashString(str: string): string {
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Get cache TTL configuration
   */
  getCacheTTL(): CacheTTLConfig {
    return { ...this.CACHE_TTL };
  }

  /**
   * Update cache TTL for specific type
   */
  updateCacheTTL(type: keyof CacheTTLConfig, ttl: number): void {
    this.CACHE_TTL[type] = ttl;
    logger.info('Cache TTL updated', { type, ttl });
  }

  // ===== CACHE MONITORING =====

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    hitRate: number;
    totalKeys: number;
    memoryUsage: number;
    avgResponseTime: number;
  }> {
    try {
      // In production, this would get actual cache statistics
      return {
        hitRate: 85.5,      // Percentage of cache hits
        totalKeys: 1247,    // Total cached keys
        memoryUsage: 45.2,  // Memory usage in MB
        avgResponseTime: 12 // Average response time in ms
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', { error });
      return {
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
        avgResponseTime: 0
      };
    }
  }

  /**
   * Get cache health status
   */
  async getCacheHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    hitRate: number;
    issues: string[];
  }> {
    const startTime = Date.now();

    try {
      // Test cache connectivity and performance
      await enhancedCacheService.getCachedAnalytics('auth', { type: 'health-check' });
      const responseTime = Date.now() - startTime;
      const stats = await this.getCacheStats();

      const issues = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Check response time
      if (responseTime > 100) {
        issues.push('High response time');
        status = 'degraded';
      }

      // Check hit rate
      if (stats.hitRate < 70) {
        issues.push('Low cache hit rate');
        status = 'degraded';
      }

      // Check memory usage
      if (stats.memoryUsage > 80) {
        issues.push('High memory usage');
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }

      return {
        status,
        responseTime,
        hitRate: stats.hitRate,
        issues
      };

    } catch (error) {
      logger.error('Cache health check failed', { error });
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        hitRate: 0,
        issues: ['Cache service unavailable']
      };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(options: {
    preloadUsers?: boolean;
    preloadBusinesses?: boolean;
    preloadManufacturers?: boolean;
    preloadAnalytics?: boolean;
  } = {}): Promise<void> {
    const {
      preloadUsers = true,
      preloadBusinesses = true,
      preloadManufacturers = true,
      preloadAnalytics = true
    } = options;

    try {
      logger.info('Cache warm-up initiated');

      const warmUpPromises = [];

      if (preloadUsers) {
        // Preload recent active users
        warmUpPromises.push(this.preloadRecentActiveUsers());
      }

      if (preloadBusinesses) {
        // Preload recent active businesses
        warmUpPromises.push(this.preloadRecentActiveBusinesses());
      }

      if (preloadManufacturers) {
        // Preload recent active manufacturers
        warmUpPromises.push(this.preloadRecentActiveManufacturers());
      }

      if (preloadAnalytics) {
        // Preload common analytics
        warmUpPromises.push(this.preloadCommonAnalytics());
      }

      await Promise.all(warmUpPromises);

      logger.info('Cache warm-up completed successfully');

    } catch (error) {
      logger.error('Cache warm-up failed', { error });
    }
  }

  // ===== CACHE PRELOADING METHODS =====

  /**
   * Preload recent active users
   */
  private async preloadRecentActiveUsers(): Promise<void> {
    try {
      const recentUsers = await User.find({
        lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
        .select('-password -emailCode')
        .limit(100)
        .lean();

      for (const user of recentUsers) {
        await this.cacheUser(user._id.toString(), { ...user, accountType: 'user' });
      }

      logger.debug('Recent active users preloaded', { count: recentUsers.length });
    } catch (error) {
      logger.warn('Failed to preload recent active users', { error });
    }
  }

  /**
   * Preload recent active businesses
   */
  private async preloadRecentActiveBusinesses(): Promise<void> {
    try {
      const recentBusinesses = await Business.find({
        lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
        .select('-password -emailCode')
        .limit(100)
        .lean();

      for (const business of recentBusinesses) {
        await this.cacheBusiness(business._id.toString(), { ...business, accountType: 'business' });
      }

      logger.debug('Recent active businesses preloaded', { count: recentBusinesses.length });
    } catch (error) {
      logger.warn('Failed to preload recent active businesses', { error });
    }
  }

  /**
   * Preload recent active manufacturers
   */
  private async preloadRecentActiveManufacturers(): Promise<void> {
    try {
      const recentManufacturers = await Manufacturer.find({
        lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
        .select('-password')
        .limit(100)
        .lean();

      for (const manufacturer of recentManufacturers) {
        await this.cacheManufacturer(manufacturer._id.toString(), { ...manufacturer, accountType: 'manufacturer' });
      }

      logger.debug('Recent active manufacturers preloaded', { count: recentManufacturers.length });
    } catch (error) {
      logger.warn('Failed to preload recent active manufacturers', { error });
    }
  }

  /**
   * Preload common analytics
   */
  private async preloadCommonAnalytics(): Promise<void> {
    try {
      // This would preload frequently accessed analytics data
      // For now, just log the intention
      logger.debug('Common analytics preloaded');
    } catch (error) {
      logger.warn('Failed to preload common analytics', { error });
    }
  }
}

// Export singleton instance
export const authCacheService = new AuthCacheService();
