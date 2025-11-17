import { cacheStoreService } from '../../infrastructure/cache/core/cacheStore.service';
import { logger } from '../../../utils/logger';
import { domainRegistryService } from '../core/domainRegistry.service';
import type { DomainMappingRecord } from '../core/domainStorage.service';

interface LocalCacheEntry {
  businessId: string;
  expiresAt: number;
}

const CACHE_PREFIX = 'domains:lookup';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export class DomainCacheService {
  private readonly localCache = new Map<string, LocalCacheEntry>();

  constructor(
    private readonly registry = domainRegistryService
  ) {}

  /**
   * Cache a domain to business mapping for quick tenant resolution.
   */
  async cacheDomain(domain: string, businessId: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    const key = this.buildKey(normalizedDomain);

    await cacheStoreService.set(key, businessId, { ttl: ttlSeconds });
    this.localCache.set(normalizedDomain, {
      businessId,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    logger.debug('Domain cached', { domain: normalizedDomain, businessId });
  }

  /**
   * Retrieve the business id for a cached domain mapping.
   */
  async getBusinessId(domain: string): Promise<string | null> {
    const normalizedDomain = this.normalizeDomain(domain);
    const local = this.localCache.get(normalizedDomain);

    if (local && local.expiresAt > Date.now()) {
      return local.businessId;
    }

    const key = this.buildKey(normalizedDomain);
    const cached = await cacheStoreService.get<string>(key);
    if (cached) {
      this.localCache.set(normalizedDomain, {
        businessId: cached,
        expiresAt: Date.now() + DEFAULT_TTL_SECONDS * 1000
      });
      return cached;
    }

    const mapping = await this.registry.findDomain(normalizedDomain);
    if (!mapping) {
      return null;
    }

    const businessId = String(mapping.business);
    await this.cacheDomain(normalizedDomain, businessId);
    return businessId;
  }

  /**
   * Remove a cached domain mapping.
   */
  async invalidateDomain(domain: string): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    const key = this.buildKey(normalizedDomain);

    await cacheStoreService.delete(key);
    this.localCache.delete(normalizedDomain);
  }

  /**
   * Prime the cache with all domains for a business.
   */
  async warmBusinessDomains(businessId: string): Promise<void> {
    const domains = await this.registry.listDomains(businessId);
    await Promise.all(domains.map(domain => this.cacheDomain(domain.domain, businessId)));
  }

  /**
   * Remove all cached domain mappings for a business.
   */
  async invalidateBusinessDomains(businessId: string): Promise<void> {
    const domains = await this.registry.listDomains(businessId);
    await Promise.all(domains.map(domain => this.invalidateDomain(domain.domain)));
  }

  private buildKey(domain: string): string {
    return `${CACHE_PREFIX}:${domain}`;
  }

  private normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase();
  }
}

export const domainCacheService = new DomainCacheService();
