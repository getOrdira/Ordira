// src/services/tenants/features/analytics.service.ts

import { tenantDataService, TenantDataService } from '../core/tenantData.service';
import type { TenantAnalyticsOverview } from '../utils/types';

export class TenantAnalyticsService {
  constructor(private readonly dataService: TenantDataService = tenantDataService) {}

  async getTenantAnalytics(): Promise<TenantAnalyticsOverview> {
    return this.dataService.getTenantAnalytics();
  }
}

export const tenantAnalyticsService = new TenantAnalyticsService();
