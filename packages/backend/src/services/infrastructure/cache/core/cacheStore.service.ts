import type { Redis as RedisType } from 'ioredis';
import { logger } from '../../../../utils/logger';
import { cacheConnectionService } from './cacheConnection.service';
import { cacheValidationService } from '../validation/cacheValidation.service';
import { buildCacheKey } from '../utils/keyBuilder.util';
import type { CacheOptions, CacheHealth, CacheStats } from '../utils/types';

export class CacheStoreService {
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0
  };

  private get redis(): RedisType | null {
    return cacheConnectionService.getClient();
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const client = this.redis;
    if (!client) {
      return null;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), options.prefix);

    try {
      const cached = await client.get(cacheKey);
      this.stats.operations++;

      if (cached === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      if (options.serialize) {
        return JSON.parse(cached) as T;
      }

      return cached as unknown as T;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), options.prefix);
    const ttl = cacheValidationService.ensureTtl(options.ttl);

    try {
      const payload = options.serialize ? JSON.stringify(value) : (value as unknown as string);
      if (ttl) {
        await client.set(cacheKey, payload, 'EX', ttl);
      } else {
        await client.set(cacheKey, payload);
      }
      this.stats.operations++;
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string, prefix?: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), prefix);
    try {
      await client.del(cacheKey);
      this.stats.operations++;
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string, prefix?: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), prefix);
    try {
      const result = await client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    const client = this.redis;
    if (!client) {
      return keys.map(() => null);
    }

    const cacheKeys = keys.map((key) => buildCacheKey(cacheValidationService.ensureKey(key), prefix));
    try {
      const results = await client.mget(cacheKeys);
      return results.map((value) => value ? JSON.parse(value) as T : null);
    } catch (error) {
      logger.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(pairs: Array<{ key: string; value: T; ttl?: number }>, prefix?: string): Promise<boolean> {
    const client = this.redis;
    if (!client || pairs.length === 0) {
      return false;
    }

    const pipeline = client.pipeline();
    try {
      for (const pair of pairs) {
        const cacheKey = buildCacheKey(cacheValidationService.ensureKey(pair.key), prefix);
        const ttl = cacheValidationService.ensureTtl(pair.ttl);
        const payload = JSON.stringify(pair.value);
        if (ttl) {
          pipeline.set(cacheKey, payload, 'EX', ttl);
        } else {
          pipeline.set(cacheKey, payload);
        }
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  async increment(key: string, amount: number = 1, options: CacheOptions = {}): Promise<number> {
    const client = this.redis;
    if (!client) {
      return amount;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), options.prefix);
    try {
      const result = await client.incrby(cacheKey, amount);
      if (options.ttl) {
        await client.expire(cacheKey, cacheValidationService.ensureTtl(options.ttl)!);
      }
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      throw error;
    }
  }

  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    const client = this.redis;
    if (!client) {
      return false;
    }

    const cacheKey = buildCacheKey(cacheValidationService.ensureKey(key), prefix);
    try {
      const result = await client.expire(cacheKey, cacheValidationService.ensureTtl(ttl)!);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async keys(pattern: string, prefix?: string): Promise<string[]> {
    const client = this.redis;
    if (!client) {
      return [];
    }

    const cachePattern = buildCacheKey(pattern, prefix);
    try {
      return await client.keys(cachePattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  async clear(pattern?: string, prefix?: string): Promise<number> {
    const client = this.redis;
    if (!client) {
      return 0;
    }

    try {
      if (pattern) {
        const fullPattern = buildCacheKey(pattern, prefix);
        const keys = await client.keys(fullPattern);
        if (keys.length > 0) {
          await client.del(...keys);
          return keys.length;
        }
        return 0;
      }

      await client.flushdb();
      return 1;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    const client = this.redis;

    if (!client) {
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
      const [memoryInfo, clientInfo] = await Promise.all([
        client.info('memory'),
        client.info('clients')
      ]);

      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      const clientMatch = clientInfo.match(/connected_clients:([0-9]+)/);

      const hitRate = this.stats.operations > 0 ? this.stats.hits / this.stats.operations : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        totalOperations: this.stats.operations,
        memoryUsage: memoryMatch ? memoryMatch[1] : 'unknown',
        connectedClients: clientMatch ? parseInt(clientMatch[1], 10) : 0
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        totalOperations: this.stats.operations,
        memoryUsage: 'Error collecting stats',
        connectedClients: 0
      };
    }
  }

  async healthCheck(): Promise<CacheHealth> {
    const client = this.redis;
    if (!client) {
      return {
        healthy: false,
        latency: 0,
        error: 'Redis not initialized'
      };
    }

    const start = Date.now();
    try {
      await client.ping();
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnect(): Promise<void> {
    await cacheConnectionService.disconnect();
  }
}

export const cacheStoreService = new CacheStoreService();
