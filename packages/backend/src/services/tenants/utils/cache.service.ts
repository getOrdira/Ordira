// src/services/tenants/utils/cache.service.ts

import type { IBrandSettings } from '../../../models/brandSettings.model';
import { logger } from '../../../utils/logger';
import type { TenantCacheEntry } from './types';

type CacheKeyType = 'subdomain' | 'domain';

export class TenantCacheService {
  private cache = new Map<string, TenantCacheEntry>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  private buildKey(identifier: string, type: CacheKeyType): string {
    return `${type}:${identifier}`;
  }

  private isExpired(entry: TenantCacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  get(identifier: string, type: CacheKeyType): TenantCacheEntry | null {
    const key = this.buildKey(identifier, type);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(identifier: string, type: CacheKeyType, settings: IBrandSettings, business: any, ttlMs?: number): void {
    const key = this.buildKey(identifier, type);
    const cacheEntry: TenantCacheEntry = {
      settings,
      business,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTtlMs
    };

    this.cache.set(key, cacheEntry);
  }

  invalidate(identifier: string, type: CacheKeyType): void {
    const key = this.buildKey(identifier, type);
    this.cache.delete(key);
  }

  invalidateMany(identifiers: string[], type: CacheKeyType): void {
    for (const identifier of identifiers) {
      this.invalidate(identifier, type);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  warmup(
    identifiers: string[],
    loader: (identifier: string, type: CacheKeyType) => Promise<void>
  ): Promise<void[]> {
    const tasks: Promise<void>[] = [];

    for (const identifier of identifiers) {
      tasks.push(
        loader(identifier, 'subdomain').catch(error => {
          logger.warn(`Failed to warmup subdomain cache for ${identifier}`, error);
        })
      );
      tasks.push(
        loader(identifier, 'domain').catch(error => {
          logger.warn(`Failed to warmup domain cache for ${identifier}`, error);
        })
      );
    }

    return Promise.all(tasks);
  }
}

export const tenantCacheService = new TenantCacheService();
