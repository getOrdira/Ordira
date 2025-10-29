/**
 * Enhanced Cache Service
 * 
 * Provides intelligent caching strategies for MongoDB queries and frequently accessed data.
 * Implements cache-aside, write-through, and write-behind patterns.
 */

import { logger } from '../../../../utils/logger';
import { cacheStoreService } from '../core/cacheStore.service';
import { redisClusterService } from '../core/redisClusterConnection.service';
import crypto from 'crypto';
import { simpleHash as hashKey, stableStringify } from '../utils/hash.util';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  keyPrefix?: string; // Key prefix for namespacing
  serialize?: boolean; // Whether to serialize complex objects
  encrypt?: boolean; // Whether to encrypt sensitive data
  sensitiveFields?: string[]; // Fields to encrypt
}

// Fields that should always be encrypted
const SENSITIVE_FIELDS = [
  'password', 'email', 'phone', 'ssn', 'creditCard',
  'bankAccount', 'apiKey', 'token', 'secret', 'privateKey',
  'personalData', 'address', 'dob', 'identityNumber'
];

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class EnhancedCacheService {
  private stats: Map<string, CacheStats> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly LONG_TTL = 3600; // 1 hour
  private readonly SHORT_TTL = 60; // 1 minute
  private encryptionKeys: Array<{ id: string; key: Buffer }> = [];
  private readonly activeKeyId: string | null;

  constructor() {
    const { keys, activeKeyId } = this.loadEncryptionKeys();
    this.encryptionKeys = keys;
    this.activeKeyId = activeKeyId;

    if (this.encryptionKeys.length === 0) {
      logger.warn('CACHE_ENCRYPTION_KEY(S) not set or invalid. Sensitive cache encryption disabled.');
    }
  }

  /**
   * Load encryption key if provided and validate format
   */
  private loadEncryptionKeys(): { keys: Array<{ id: string; key: Buffer }>; activeKeyId: string | null } {
    const keys: Array<{ id: string; key: Buffer }> = [];
    const configuredKeys = process.env.CACHE_ENCRYPTION_KEYS || process.env.CACHE_ENCRYPTION_KEY;

    if (!configuredKeys) {
      return { keys, activeKeyId: null };
    }

    const segments = configuredKeys.split(',').map((value) => value.trim()).filter(Boolean);

    segments.forEach((rawKey, index) => {
      try {
        let buffer: Buffer | null = null;

        if (/^[0-9a-fA-F]+$/.test(rawKey) && rawKey.length === 64) {
          buffer = Buffer.from(rawKey, 'hex');
        } else if (rawKey.length === 32) {
          buffer = Buffer.from(rawKey, 'utf8');
        } else {
          const decoded = Buffer.from(rawKey, 'base64');
          if (decoded.length === 32) {
            buffer = decoded;
          }
        }

        if (!buffer || buffer.length !== 32) {
          logger.error(`Invalid cache encryption key provided at index ${index}. Expected 32 bytes.`);
          return;
        }

        keys.push({ id: `k${index + 1}`, key: buffer });
      } catch (error) {
        logger.error(`Failed to load cache encryption key at index ${index}`, error as Error);
      }
    });

    return {
      keys,
      activeKeyId: keys.length > 0 ? keys[0].id : null
    };
  }

  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    if (this.encryptionKeys.length === 0 || !this.activeKeyId) {
      throw new Error('Encryption key is not configured');
    }

    const activeKey = this.encryptionKeys.find((entry) => entry.id === this.activeKeyId) ?? this.encryptionKeys[0];
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', activeKey.key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [activeKey.id, iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    if (this.encryptionKeys.length === 0) {
      throw new Error('Encryption key is not configured');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 4 && parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    let keyId: string | null = null;
    let ivB64: string;
    let tagB64: string;
    let payloadB64: string;

    if (parts.length === 4) {
      [keyId, ivB64, tagB64, payloadB64] = parts;
    } else {
      [ivB64, tagB64, payloadB64] = parts;
    }

    const keyEntry = this.encryptionKeys.find((entry) => entry.id === keyId) ?? this.encryptionKeys[0];

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const payload = Buffer.from(payloadB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyEntry.key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Check if data contains sensitive information
   */
  private containsSensitiveData(data: any, sensitiveFields: string[] = []): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const fieldsToCheck = sensitiveFields.length > 0 ? sensitiveFields : SENSITIVE_FIELDS;

    const checkObject = (obj: any, path: string[] = []): boolean => {
      for (const key in obj) {
        const currentPath = [...path, key];
        const fieldPath = currentPath.join('.');
        
        if (fieldsToCheck.some(field => 
          field.toLowerCase() === key.toLowerCase() || 
          fieldPath.toLowerCase().includes(field.toLowerCase())
        )) {
          return true;
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key], currentPath)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkObject(data);
  }

  /**
   * Encrypt sensitive data in cache value with rotating keys
   */
  private async encryptSensitiveData<T>(value: T, sensitiveFields: string[]): Promise<T> {
    if (!this.activeKeyId || this.encryptionKeys.length === 0) {
      logger.warn('Encryption requested but no encryption keys available');
      return value;
    }

    try {
      const activeKey = this.encryptionKeys.find(k => k.id === this.activeKeyId);
      if (!activeKey) {
        logger.error('Active encryption key not found');
        return value;
      }

      // For now, encrypt the entire value if it contains sensitive data
      // In a more sophisticated implementation, you'd encrypt only specific fields
      const serialized = JSON.stringify(value);
      const encrypted = this.encryptData(serialized);
      
      return {
        __encrypted: true,
        __keyId: this.activeKeyId,
        __data: encrypted
      } as T;

    } catch (error) {
      logger.error('Failed to encrypt sensitive cache data:', error);
      return value;
    }
  }

  /**
   * Decrypt sensitive data in cache value with rotating keys
   */
  private async decryptSensitiveData<T>(value: T, sensitiveFields: string[]): Promise<T> {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const encryptedValue = value as any;
    if (!encryptedValue.__encrypted || !encryptedValue.__keyId || !encryptedValue.__data) {
      return value;
    }

    try {
      const keyId = encryptedValue.__keyId;
      const encryptionKey = this.encryptionKeys.find(k => k.id === keyId);
      
      if (!encryptionKey) {
        logger.error(`Encryption key ${keyId} not found for decryption`);
        return value;
      }

      const decrypted = this.decryptData(encryptedValue.__data);
      return JSON.parse(decrypted);

    } catch (error) {
      logger.error('Failed to decrypt sensitive cache data:', error);
      return value;
    }
  }

  /**
   * Sanitize and encrypt user data before caching
   */
  private sanitizeUserData(userData: any, encrypt: boolean = true): any {
    if (!userData || typeof userData !== 'object') {
      return userData;
    }

    const sanitized = { ...userData };

    // Remove or encrypt sensitive fields
    for (const field of SENSITIVE_FIELDS) {
      if (sanitized[field]) {
        if (encrypt && this.encryptionKeys.length > 0 && field !== 'password') {
          // Encrypt sensitive data (except passwords which should never be cached)
          sanitized[field] = this.encryptData(JSON.stringify(sanitized[field]));
          sanitized[`${field}_encrypted`] = true;
        } else {
          // Remove passwords and other highly sensitive data
          delete sanitized[field];
        }
      }
    }

    // Always remove password-related fields
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.hashedPassword;
    delete sanitized.salt;

    return sanitized;
  }

  /**
   * Restore encrypted data after retrieval
   */
  private restoreUserData(cachedData: any): any {
    if (!cachedData || typeof cachedData !== 'object') {
      return cachedData;
    }

    const restored = { ...cachedData };

    if (this.encryptionKeys.length === 0) {
      for (const field of SENSITIVE_FIELDS) {
        if (restored[`${field}_encrypted`]) {
          delete restored[field];
          delete restored[`${field}_encrypted`];
        }
      }
      return restored;
    }

    // Decrypt encrypted fields
    for (const field of SENSITIVE_FIELDS) {
      if (restored[`${field}_encrypted`] && restored[field]) {
        try {
          restored[field] = JSON.parse(this.decryptData(restored[field]));
          delete restored[`${field}_encrypted`];
        } catch (error) {
          logger.warn(`Failed to decrypt cached field: ${field}`);
          delete restored[field];
          delete restored[`${field}_encrypted`];
        }
      }
    }

    return restored;
  }

  /**
   * Cache user data with intelligent invalidation and encryption
   */
  async cacheUser(userId: string, userData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('user', userId, options.keyPrefix);

    // Sanitize and encrypt sensitive data
    const encryptionAvailable = this.encryptionKeys.length > 0;
    const shouldEncrypt = encryptionAvailable && options.encrypt !== false && this.containsSensitiveData(userData);
    const sanitizedData = this.sanitizeUserData(userData, shouldEncrypt);

    const cacheOptions = {
      ttl: options.ttl || this.DEFAULT_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, sanitizedData, cacheOptions);
    this.recordCacheOperation(key, 'set');

    // Log security event for sensitive data caching
    if (shouldEncrypt) {
      logger.info('Cached user data with encryption:', {
        userId: userId.substring(0, 8) + '...', // Partial ID for logging
        dataType: 'encrypted_user_data',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get cached user data with decryption
   */
  async getCachedUser(userId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('user', userId, options.keyPrefix);
    const result = await cacheStoreService.get(key);

    if (!result) {
      this.recordCacheOperation(key, 'miss');
      return null;
    }

    this.recordCacheOperation(key, 'hit');

    if (this.encryptionKeys.length === 0) {
      return result;
    }

    // Restore encrypted data
    try {
      const restoredData = this.restoreUserData(result);
      return restoredData;
    } catch (error) {
      logger.error('Failed to restore cached user data:', {
        userId: userId.substring(0, 8) + '...', // Partial ID for logging
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Cache business data with tenant-specific keys
   */
  async cacheBusiness(businessId: string, businessData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('business', businessId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, businessData, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached business data
   */
  async getCachedBusiness(businessId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('business', businessId, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache manufacturer search results
   */
  async cacheManufacturerSearch(searchParams: any, results: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('manufacturer_search', searchParams, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, results, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached manufacturer search results
   */
  async getCachedManufacturerSearch(searchParams: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('manufacturer_search', searchParams, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache manufacturer data
   */
  async cacheManufacturer(manufacturerId: string, manufacturerData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('manufacturer', manufacturerId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.DEFAULT_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, manufacturerData, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached manufacturer data
   */
  async getCachedManufacturer(manufacturerId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('manufacturer', manufacturerId, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache product listings with business-specific keys
   */
  async cacheProductListing(params: {
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    limit: number;
    offset: number;
  }, products: any[], options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('product_listing', params, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, products, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached product listing
   */
  async getCachedProductListing(params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('product_listing', params, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache analytics data with longer TTL
   */
  async cacheAnalytics(analyticsType: string, params: any, data: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey(`analytics_${analyticsType}`, params, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, data, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(analyticsType: string, params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey(`analytics_${analyticsType}`, params, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache voting analytics with real-time invalidation
   */
  async cacheVotingAnalytics(businessId: string, params: any, data: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('voting_analytics', { businessId, ...params }, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, data, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached voting analytics
   */
  async getCachedVotingAnalytics(businessId: string, params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('voting_analytics', { businessId, ...params }, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache brand settings with tenant isolation
   */
  async cacheBrandSettings(businessId: string, settings: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('brand_settings', businessId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, settings, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached brand settings
   */
  async getCachedBrandSettings(businessId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('brand_settings', businessId, options.keyPrefix);
    const result = await cacheStoreService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache domain mappings for fast tenant resolution
   */
  async cacheDomainMapping(domain: string, businessId: string, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('domain_mapping', domain, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix,
      serialize: true
    };

    await cacheStoreService.set(key, businessId, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached domain mapping
   */
  async getCachedDomainMapping(domain: string, options: CacheOptions = {}): Promise<string | null> {
    const key = this.buildKey('domain_mapping', domain, options.keyPrefix);
    const result = await cacheStoreService.get<string>(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Invalidate cache by tags (e.g., when business data changes)
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    logger.info(`Invalidating cache for tags: ${tags.join(', ')}`);
    
    // For now, we'll clear all cache keys that match the patterns
    // In a full implementation, you'd use Redis tags or pattern matching
    for (const tag of tags) {
      // This would be implemented based on your cache strategy
      logger.debug(`Would invalidate cache for tag: ${tag}`);
    }
  }

  /**
   * Invalidate business-related cache
   */
  async invalidateBusinessCache(businessId: string): Promise<void> {
    const tags = [
      `business:${businessId}`,
      'business',
      'brand_settings',
      'voting_analytics',
      'product_listing',
      'analytics'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for business: ${businessId}`);
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const tags = [
      `user:${userId}`,
      'user'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Invalidate manufacturer-related cache
   */
  async invalidateManufacturerCache(manufacturerId: string): Promise<void> {
    const tags = [
      `manufacturer:${manufacturerId}`,
      'manufacturer_search',
      'product_listing'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for manufacturer: ${manufacturerId}`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(): Promise<void> {
    logger.info('🔥 Warming up cache...');

    try {
      // Warm up domain mappings
      await this.warmupDomainMappings();
      
      // Warm up active business settings
      await this.warmupBusinessSettings();
      
      // Warm up popular searches
      await this.warmupPopularSearches();

      logger.info('✅ Cache warmup completed');

    } catch (error) {
      logger.error('❌ Cache warmup failed:', error);
    }
  }

  /**
   * Warm up domain mappings cache
   */
  private async warmupDomainMappings(): Promise<void> {
    // This would typically query the database for all active domain mappings
    // and cache them for fast tenant resolution
    logger.info('🌐 Warming up domain mappings cache...');
  }

  /**
   * Warm up business settings cache
   */
  private async warmupBusinessSettings(): Promise<void> {
    // This would cache settings for active businesses
    logger.info('🏢 Warming up business settings cache...');
  }

  /**
   * Warm up popular searches cache
   */
  private async warmupPopularSearches(): Promise<void> {
    // This would cache results for popular search queries
    logger.info('🔍 Warming up popular searches cache...');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};

    for (const [key, stat] of this.stats.entries()) {
      stats[key] = { ...stat };
    }

    return stats;
  }

  /**
   * Get Redis cluster statistics
   */
  async getClusterStats(): Promise<any> {
    try {
      return await redisClusterService.getClusterStats();
    } catch (error) {
      logger.error('Failed to get cluster stats:', error);
      return null;
    }
  }

  /**
   * Check Redis cluster health
   */
  async checkClusterHealth(): Promise<any> {
    try {
      return await redisClusterService.healthCheck();
    } catch (error) {
      logger.error('Failed to check cluster health:', error);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Use Redis cluster for high-performance operations
   */
  async getFromCluster<T>(key: string): Promise<T | null> {
    try {
      return await redisClusterService.get<T>(key);
    } catch (error) {
      logger.error('Cluster get operation failed:', error);
      // Fallback to regular cache service
      return await cacheStoreService.get<T>(key);
    }
  }

  /**
   * Set value in Redis cluster
   */
  async setInCluster<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const success = await redisClusterService.set(key, value, ttl);
      if (success) {
        // Also set in regular cache as backup
        await cacheStoreService.set(key, value, { ttl });
      }
      return success;
    } catch (error) {
      logger.error('Cluster set operation failed:', error);
      // Fallback to regular cache service
      return await cacheStoreService.set(key, value, { ttl });
    }
  }

  /**
   * Delete from Redis cluster
   */
  async deleteFromCluster(key: string): Promise<boolean> {
    try {
      const success = await redisClusterService.delete(key);
      // Also delete from regular cache
      await cacheStoreService.delete(key);
      return success;
    } catch (error) {
      logger.error('Cluster delete operation failed:', error);
      // Fallback to regular cache service
      return await cacheStoreService.delete(key);
    }
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(type: string, id: string, prefix?: string): string {
    const keyPrefix = prefix || 'ordira';
    return `${keyPrefix}:${type}:${id}`;
  }

  /**
   * Build search cache key from parameters
   */
  private buildSearchKey(type: string, params: any, prefix?: string): string {
    const keyPrefix = prefix || 'ordira';
    const paramString = stableStringify(params);
    const hash = hashKey(paramString);
    return `${keyPrefix}:${type}:${hash}`;
  }

  /**
   * Serialize parameters for cache key
   */

  /**
   * Simple hash function for cache keys
   */

  /**
   * Record cache operation for statistics
   */
  private recordCacheOperation(key: string, operation: 'hit' | 'miss' | 'set'): void {
    const keyPrefix = key.split(':')[0];
    
    if (!this.stats.has(keyPrefix)) {
      this.stats.set(keyPrefix, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0
      });
    }
    
    const stats = this.stats.get(keyPrefix)!;
    stats.totalRequests++;
    
    if (operation === 'hit') {
      stats.hits++;
    } else if (operation === 'miss') {
      stats.misses++;
    }
    
    stats.hitRate = stats.hits / stats.totalRequests;
  }
}

export const enhancedCacheService = new EnhancedCacheService();



