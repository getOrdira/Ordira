// src/services/tenants/index.ts

import { tenantDataService } from './core/tenantData.service';
import { tenantResolutionService } from './features/resolution.service';
import { tenantManagementService } from './features/management.service';
import { tenantAnalyticsService } from './features/analytics.service';
import { tenantCacheService } from './utils/cache.service';
import { tenantDomainValidationService } from './validation/domainValidation.service';

export {
  tenantDataService,
  TenantDataService
} from './core/tenantData.service';

export {
  tenantResolutionService,
  TenantResolutionService
} from './features/resolution.service';

export {
  tenantManagementService,
  TenantManagementService
} from './features/management.service';

export {
  tenantAnalyticsService,
  TenantAnalyticsService
} from './features/analytics.service';

export {
  tenantCacheService,
  TenantCacheService
} from './utils/cache.service';

export {
  tenantDomainValidationService,
  TenantDomainValidationService
} from './validation/domainValidation.service';

export type {
  TenantResolutionResult,
  TenantValidationResult,
  TenantAnalyticsOverview,
  TenantListFilters,
  TenantListResult
} from './utils/types';

export const tenantServices = {
  resolution: tenantResolutionService,
  management: tenantManagementService,
  analytics: tenantAnalyticsService,
  data: tenantDataService,
  cache: tenantCacheService,
  validation: tenantDomainValidationService
};
