// src/services/tenants/features/management.service.ts

import type { IBrandSettings } from '../../../models/deprecated/brandSettings.model';
import { tenantDataService, TenantDataService } from '../core/tenantData.service';
import { tenantCacheService, TenantCacheService } from '../utils/cache.service';
import { tenantDomainValidationService, TenantDomainValidationService } from '../validation/domainValidation.service';
import type { TenantListFilters, TenantListResult } from '../utils/types';

export class TenantManagementService {
  constructor(
    private readonly dataService: TenantDataService = tenantDataService,
    private readonly cacheService: TenantCacheService = tenantCacheService,
    private readonly validationService: TenantDomainValidationService = tenantDomainValidationService
  ) {}

  async getTenantByBusinessId(businessId: string): Promise<IBrandSettings | null> {
    return this.dataService.getTenantByBusinessId(businessId);
  }

  async createTenantSettings(
    businessId: string,
    subdomain: string,
    customDomain?: string
  ): Promise<IBrandSettings> {
    const subdomainValidation = this.validationService.validateSubdomain(subdomain);
    if (!subdomainValidation.valid) {
      throw new Error(`Invalid subdomain: ${subdomainValidation.reason}`);
    }

    if (customDomain) {
      const customDomainValidation = this.validationService.validateCustomDomain(customDomain);
      if (!customDomainValidation.valid) {
        throw new Error(`Invalid custom domain: ${customDomainValidation.reason}`);
      }
    }

    const tenant = await this.dataService.createTenantSettings(businessId, subdomain, customDomain);

    this.cacheService.invalidate(subdomain, 'subdomain');
    if (customDomain) {
      this.cacheService.invalidate(customDomain, 'domain');
    }

    return tenant;
  }

  async updateTenantSettings(
    tenantId: string,
    updates: Partial<IBrandSettings>
  ): Promise<IBrandSettings | null> {
    if (updates.subdomain) {
      const subdomainValidation = this.validationService.validateSubdomain(updates.subdomain);
      if (!subdomainValidation.valid) {
        throw new Error(`Invalid subdomain: ${subdomainValidation.reason}`);
      }
    }

    if (updates.customDomain) {
      const customDomainValidation = this.validationService.validateCustomDomain(updates.customDomain);
      if (!customDomainValidation.valid) {
        throw new Error(`Invalid custom domain: ${customDomainValidation.reason}`);
      }
    }

    const tenant = await this.dataService.updateTenantSettings(tenantId, updates);

    if (tenant) {
      if (tenant.subdomain) {
        this.cacheService.invalidate(tenant.subdomain, 'subdomain');
      }
      if (tenant.customDomain) {
        this.cacheService.invalidate(tenant.customDomain, 'domain');
      }
    }

    return tenant;
  }

  async deleteTenantSettings(tenantId: string): Promise<boolean> {
    const tenant = await this.dataService.deleteTenantSettings(tenantId);

    if (!tenant) {
      return false;
    }

    if (tenant.subdomain) {
      this.cacheService.invalidate(tenant.subdomain, 'subdomain');
    }

    if (tenant.customDomain) {
      this.cacheService.invalidate(tenant.customDomain, 'domain');
    }

    return true;
  }

  async listTenants(
    page: number = 1,
    limit: number = 50,
    filters: TenantListFilters = {}
  ): Promise<TenantListResult> {
    return this.dataService.listTenants(page, limit, filters);
  }
}

export const tenantManagementService = new TenantManagementService();
