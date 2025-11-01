// src/services/tenants/utils/types.ts

import { IBrandSettings } from '../../../models/deprecated/brandSettings.model';

export interface TenantResolutionResult {
  settings: IBrandSettings | null;
  business: any;
  identifier: string;
  isCustomDomain: boolean;
  cacheHit: boolean;
}

export interface TenantValidationResult {
  valid: boolean;
  reason?: string;
}

export interface TenantCacheEntry {
  settings: IBrandSettings;
  business: any;
  timestamp: number;
  ttl: number;
}

export interface TenantListFilters {
  plan?: string;
  isActive?: boolean;
  hasCustomDomain?: boolean;
}

export interface TenantListResult {
  tenants: IBrandSettings[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TenantAnalyticsOverview {
  totalTenants: number;
  activeTenants: number;
  tenantsByPlan: Record<string, number>;
  tenantsWithCustomDomain: number;
  averageTenantAge: number;
}
