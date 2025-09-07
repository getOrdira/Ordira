// src/services/external/cache.service.ts

import Redis from 'ioredis';
import { createAppError } from '../../middleware/error.middleware';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage: string;
  connectedClients: number;
}

/**
 * High-performance Redis caching service with advanced features
 */
export class CacheService {
  private redis: Redis;
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0
  };

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Connection pool optimization
      family: 4,
      maxmemoryPolicy: 'allkeys-lru',
      // Performance optimizations
      enableReadyCheck: true,
      maxLoadingTimeout: 5000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      this.stats.operations++;
      const fullKey = this.buildKey(key, options.prefix);
      
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      if (options.serialize !== false) {
        return JSON.parse(value);
      }
      
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached value with automatic serialization
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      this.stats.operations++;
      const fullKey = this.buildKey(key, options.prefix);
      
      let serializedValue: string;
      if (options.serialize !== false && typeof value === 'object') {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = String(value);
      }

      if (options.ttl) {
        await this.redis.setex(fullKey, options.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string, prefix?: string): Promise<boolean> {
    try {
      this.stats.operations++;
      const fullKey = this.buildKey(key, prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      this.stats.operations++;
      const fullKeys = keys.map(key => this.buildKey(key, prefix));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(keyValuePairs: Array<{ key: string; value: T; ttl?: number }>, prefix?: string): Promise<boolean> {
    try {
      this.stats.operations++;
      const pipeline = this.redis.pipeline();
      
      for (const { key, value, ttl } of keyValuePairs) {
        const fullKey = this.buildKey(key, prefix);
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (ttl) {
          pipeline.setex(fullKey, ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    try {
      this.stats.operations++;
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.incrby(fullKey, amount);
      
      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string, prefix?: string): Promise<string[]> {
    try {
      const fullPattern = this.buildKey(pattern, prefix);
      return await this.redis.keys(fullPattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Clear all cache or pattern
   */
  async clear(pattern?: string, prefix?: string): Promise<number> {
    try {
      if (pattern) {
        const fullPattern = this.buildKey(pattern, prefix);
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          return await this.redis.del(...keys);
        }
        return 0;
      } else {
        return await this.redis.flushdb();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.redis.info('memory');
      const clients = await this.redis.info('clients');
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const clientsMatch = clients.match(/connected_clients:(\d+)/);
      
      const hitRate = this.stats.operations > 0 
        ? (this.stats.hits / this.stats.operations) * 100 
        : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalOperations: this.stats.operations,
        memoryUsage: memoryMatch ? memoryMatch[1] : 'Unknown',
        connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalOperations: this.stats.operations,
        memoryUsage: 'Unknown',
        connectedClients: 0
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        latency: Date.now() - start, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }

  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache decorators for automatic caching
export function Cacheable(options: CacheOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, options);
      if (cached !== null) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheService.set(cacheKey, result, options);
      
      return result;
    };
  };
}

// Cache invalidation decorator
export function CacheInvalidate(pattern: string, prefix?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate cache after method execution
      await cacheService.clear(pattern, prefix);
      
      return result;
    };
  };
}
