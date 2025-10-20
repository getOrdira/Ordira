// src/services/tenants/features/resolution.service.ts

import type { IBrandSettings } from '../../../models/brandSettings.model';
import { tenantDataService, TenantDataService } from '../core/tenantData.service';
import { tenantCacheService, TenantCacheService } from '../utils/cache.service';
import { tenantDomainValidationService, TenantDomainValidationService } from '../validation/domainValidation.service';
import type { TenantResolutionResult } from '../utils/types';

type CacheKeyType = 'subdomain' | 'domain';

export class TenantResolutionService {
  private readonly baseDomain: string;

  constructor(
    private readonly dataService: TenantDataService = tenantDataService,
    private readonly cacheService: TenantCacheService = tenantCacheService,
    private readonly validationService: TenantDomainValidationService = tenantDomainValidationService
  ) {
    this.baseDomain = this.validationService.getBaseDomain();
  }

  async resolveTenant(hostname: string): Promise<TenantResolutionResult> {
    const host = hostname.toLowerCase();

    if (!this.validationService.validateTenantHostname(host)) {
      throw new Error('Invalid hostname');
    }

    if (host.endsWith(this.baseDomain)) {
      const subdomain = host.slice(0, host.length - this.baseDomain.length - 1);
      const validation = this.validationService.validateSubdomain(subdomain);
      if (!validation.valid) {
        throw new Error(`Invalid subdomain: ${validation.reason}`);
      }

      const result = await this.getTenant(subdomain, 'subdomain');
      return {
        ...result,
        identifier: subdomain,
        isCustomDomain: false
      };
    }

    const domainValidation = this.validationService.validateCustomDomain(host);
    if (!domainValidation.valid) {
      throw new Error(`Invalid domain: ${domainValidation.reason}`);
    }

    const result = await this.getTenant(host, 'domain');
    return {
      ...result,
      identifier: host,
      isCustomDomain: true
    };
  }

  async warmupTenantCache(identifiers: string[]): Promise<void> {
    await this.cacheService.warmup(identifiers, async (identifier, type) => {
      await this.getTenant(identifier, type);
    });
  }

  clearTenantCache(identifier: string, isSubdomain: boolean = true): void {
    this.cacheService.invalidate(identifier, isSubdomain ? 'subdomain' : 'domain');
  }

  clearAllTenantCache(): void {
    this.cacheService.clear();
  }

  getTenantCacheStats(): { size: number; entries: string[] } {
    return this.cacheService.stats();
  }

  private async getTenant(identifier: string, type: CacheKeyType): Promise<{
    settings: IBrandSettings | null;
    business: any;
    cacheHit: boolean;
  }> {
    const cached = this.cacheService.get(identifier, type);
    if (cached) {
      return {
        settings: cached.settings,
        business: cached.business,
        cacheHit: true
      };
    }

    const tenant = type === 'subdomain'
      ? await this.dataService.findBySubdomain(identifier)
      : await this.dataService.findByCustomDomain(identifier);

    if (tenant) {
      const business = tenant.business;
      this.cacheService.set(identifier, type, tenant, business);
      return {
        settings: tenant,
        business,
        cacheHit: false
      };
    }

    return {
      settings: null,
      business: null,
      cacheHit: false
    };
  }
}

export const tenantResolutionService = new TenantResolutionService();
