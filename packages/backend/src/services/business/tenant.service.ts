// src/services/business/tenant.service.ts

import type { IBrandSettings } from '../../models/brandSettings.model';
import {
  tenantResolutionService,
  tenantManagementService,
  tenantAnalyticsService,
  tenantDomainValidationService
} from '../tenants';
import type {
  TenantResolutionResult,
  TenantValidationResult,
  TenantListFilters,
  TenantListResult,
  TenantAnalyticsOverview
} from '../tenants';

export type {
  TenantResolutionResult,
  TenantValidationResult,
  TenantListFilters,
  TenantListResult,
  TenantAnalyticsOverview
} from '../tenants';

export class TenantService {
  private static instance: TenantService;

  private constructor() {}

  public static getInstance(): TenantService {
    if (!TenantService.instance) {
      TenantService.instance = new TenantService();
    }
    return TenantService.instance;
  }

  async resolveTenant(hostname: string): Promise<TenantResolutionResult> {
    return tenantResolutionService.resolveTenant(hostname);
  }

  validateSubdomain(subdomain: string): TenantValidationResult {
    return tenantDomainValidationService.validateSubdomain(subdomain);
  }

  validateCustomDomain(domain: string): TenantValidationResult {
    return tenantDomainValidationService.validateCustomDomain(domain);
  }

  validateTenantHostname(hostname: string): boolean {
    return tenantDomainValidationService.validateTenantHostname(hostname);
  }

  validateTenantPlan(tenant: IBrandSettings, requiredPlans: string[]): boolean {
    return tenantDomainValidationService.validateTenantPlan(tenant, requiredPlans);
  }

  validateTenantSetup(business: any): { valid: boolean; missingFields?: string[] } {
    return tenantDomainValidationService.validateTenantSetup(business);
  }

  validateBusinessStatus(business: any): { valid: boolean; reason?: string } {
    return tenantDomainValidationService.validateBusinessStatus(business);
  }

  clearTenantCache(identifier: string, isSubdomain: boolean = true): void {
    tenantResolutionService.clearTenantCache(identifier, isSubdomain);
  }

  clearAllTenantCache(): void {
    tenantResolutionService.clearAllTenantCache();
  }

  getTenantCacheStats(): { size: number; entries: string[] } {
    return tenantResolutionService.getTenantCacheStats();
  }

  async warmupTenantCache(identifiers: string[]): Promise<void> {
    await tenantResolutionService.warmupTenantCache(identifiers);
  }

  async getTenantByBusinessId(businessId: string): Promise<IBrandSettings | null> {
    return tenantManagementService.getTenantByBusinessId(businessId);
  }

  async createTenantSettings(
    businessId: string,
    subdomain: string,
    customDomain?: string
  ): Promise<IBrandSettings> {
    return tenantManagementService.createTenantSettings(businessId, subdomain, customDomain);
  }

  async updateTenantSettings(
    tenantId: string,
    updates: Partial<IBrandSettings>
  ): Promise<IBrandSettings | null> {
    return tenantManagementService.updateTenantSettings(tenantId, updates);
  }

  async deleteTenantSettings(tenantId: string): Promise<boolean> {
    return tenantManagementService.deleteTenantSettings(tenantId);
  }

  async getAllTenants(
    page: number = 1,
    limit: number = 50,
    filters: TenantListFilters = {}
  ): Promise<TenantListResult> {
    return tenantManagementService.listTenants(page, limit, filters);
  }

  async getTenantAnalytics(): Promise<TenantAnalyticsOverview> {
    return tenantAnalyticsService.getTenantAnalytics();
  }
}

export const tenantService = TenantService.getInstance();
