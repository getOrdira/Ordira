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
  private redis: any;
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0
  };

  constructor() {
    // Debug Redis URL
    console.log('🔍 Redis URL check:', process.env.REDIS_URL ? 'Found' : 'Not found');
    
    // Only initialize Redis if REDIS_URL is provided
    if (!process.env.REDIS_URL) {
      console.log('⚠️ No REDIS_URL provided, Redis caching disabled');
      return;
    }
    
    console.log('✅ REDIS_URL found, initializing Redis connection...');
    console.log('🔗 Redis URL:', process.env.REDIS_URL?.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

    // Parse REDIS_URL properly
    let redisConfig;
    if (process.env.REDIS_URL) {
      try {
        const url = new URL(process.env.REDIS_URL);
        redisConfig = {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
          db: url.pathname ? parseInt(url.pathname.slice(1)) || 0 : 0,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,
          family: 4,
          enableReadyCheck: true,
          retryDelayOnFailover: 100
        };
        console.log('🔗 Parsed Redis config:', { host: redisConfig.host, port: redisConfig.port, db: redisConfig.db });
      } catch (error) {
        console.error('❌ Failed to parse REDIS_URL:', error);
        redisConfig = {
          host: 'localhost',
          port: 6379,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,
          family: 4,
          enableReadyCheck: true
        };
      }
    } else {
      redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        family: 4,
        enableReadyCheck: true
      };
    }

    this.redis = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
      // Don't crash the app on Redis errors
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis ready for operations');
    });

    this.redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * Get cached value with automatic deserialization
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.redis) return null;
    
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
    if (!this.redis) return false;
    
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
    if (!this.redis) return false;
    
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
    if (!this.redis) return false;
    
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
    if (!this.redis) return keys.map(() => null);
    
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
    if (!this.redis) return false;
    
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
    if (!this.redis) return 0;
    
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
    if (!this.redis) return false;
    
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
    if (!this.redis) return [];
    
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
    if (!this.redis) return 0;
    
    try {
      if (pattern) {
        const fullPattern = this.buildKey(pattern, prefix);
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          return await this.redis.del(...keys);
        }
        return 0;
      } else {
        await this.redis.flushdb();
        return 1; // Return 1 to indicate success
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
    if (!this.redis) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalOperations: this.stats.operations,
        memoryUsage: 'Redis not available',
        connectedClients: 0
      };
    }
    
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
    if (!this.redis) {
      return { 
        healthy: false, 
        latency: 0, 
        error: 'Redis not initialized - no REDIS_URL provided' 
      };
    }
    
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
    if (!this.redis) return;
    
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
// Lazy initialization to ensure environment variables are loaded
let _cacheService: CacheService | null = null;

export const cacheService = {
  get instance() {
    if (!_cacheService) {
      _cacheService = new CacheService();
    }
    return _cacheService;
  },
  
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    return (this.instance as CacheService).get<T>(key, options);
  },
  
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    return (this.instance as CacheService).set<T>(key, value, options);
  },
  
  async delete(key: string, prefix?: string): Promise<boolean> {
    return this.instance.delete(key, prefix);
  },
  
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    return this.instance.healthCheck();
  },
  
  async getStats(): Promise<CacheStats> {
    return this.instance.getStats();
  },
  
  async disconnect(): Promise<void> {
    return this.instance.disconnect();
  }
} as {
  instance: CacheService;
  get<T>(key: string, options?: CacheOptions): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
  delete(key: string, prefix?: string): Promise<boolean>;
  clear(pattern?: string, prefix?: string): Promise<number>;
  healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }>;
  getStats(): Promise<CacheStats>;
  disconnect(): Promise<void>;
};

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
