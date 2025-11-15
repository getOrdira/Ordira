import {
  platformAnalyticsDataService,
  dashboardAggregationService,
  reportGenerationService,
  reportingDataService,
  systemHealthService,
  analyticsValidationService
} from '../analytics';
import type {
  AnalyticsReportPayload,
  AnalyticsReportRequest,
  AnalyticsReportType,
  AnalyticsTimeRange,
  BusinessAnalyticsSnapshot,
  DashboardAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  PlatformVotingAnalytics,
  ProductAnalyticsSnapshot
} from '../analytics';

export type { AnalyticsTimeRange } from '../analytics';
export type {
  PlatformVotingAnalytics as VotingAnalytics,
  BusinessAnalyticsSnapshot as BusinessAnalytics,
  ProductAnalyticsSnapshot as ProductAnalytics,
  ManufacturerAnalyticsSnapshot as ManufacturerAnalytics,
  DashboardAnalyticsSnapshot as DashboardAnalytics,
  AnalyticsReportPayload
} from '../analytics';

/**
 * Backwards compatible analytics service wrapper.
 * Delegates to the modular analytics architecture while preserving legacy APIs.
 */
export class AnalyticsService {
  /**
   * Delegate voting analytics to the modular platform analytics service.
   */
  async getVotingAnalytics(
    businessId: string,
    timeRange?: AnalyticsTimeRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<PlatformVotingAnalytics> {
    const validatedId = analyticsValidationService.ensureBusinessContext(businessId);
    return platformAnalyticsDataService.getVotingAnalyticsForBusiness(validatedId, {
      timeRange,
      groupBy
    });
  }

  /**
   * Delegate business analytics retrieval.
   */
  async getBusinessAnalytics(filterOptions: {
    industry?: string;
    verified?: boolean;
    plan?: string;
    dateRange?: AnalyticsTimeRange;
  } = {}): Promise<BusinessAnalyticsSnapshot> {
    return platformAnalyticsDataService.getBusinessAnalytics({
      industry: filterOptions.industry,
      verified: filterOptions.verified,
      plan: filterOptions.plan,
      timeRange: filterOptions.dateRange
    });
  }

  /**
   * Delegate product analytics retrieval.
   */
  async getProductAnalytics(
    businessId?: string,
    manufacturerId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<ProductAnalyticsSnapshot> {
    return platformAnalyticsDataService.getProductAnalytics({
      businessId,
      manufacturerId,
      timeRange
    });
  }

  /**
   * Delegate manufacturer analytics retrieval.
   */
  async getManufacturerAnalytics(timeRange?: AnalyticsTimeRange): Promise<ManufacturerAnalyticsSnapshot> {
    return platformAnalyticsDataService.getManufacturerAnalytics({ timeRange });
  }

  /**
   * Delegate dashboard aggregation to modular service.
   */
  async getDashboardAnalytics(
    businessId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<DashboardAnalyticsSnapshot> {
    return dashboardAggregationService.getDashboardAnalytics({
      businessId,
      timeRange,
      includeSystemHealth: true
    });
  }

  /**
   * Delegate dashboard analytics against read replica when requested.
   */
  async getDashboardAnalyticsWithReplica(
    businessId: string,
    timeRange?: AnalyticsTimeRange
  ) {
    const validatedId = analyticsValidationService.ensureBusinessContext(businessId);
    return reportingDataService.getDashboardAnalyticsWithReplica(validatedId, timeRange);
  }

  /**
   * Delegate business reporting generation to modular report service.
   */
  async getBusinessReportingData(businessId: string, reportType: string, timeRange?: AnalyticsTimeRange): Promise<AnalyticsReportPayload> {
    const normalizedType = this.normalizeReportType(reportType);
    const request: AnalyticsReportRequest = {
      businessId: analyticsValidationService.ensureBusinessContext(businessId),
      reportType: normalizedType,
      timeRange,
      includeRawData: true
    };

    return reportGenerationService.generateReport(request);
  }

  /**
   * Delegate platform-wide voting analytics.
   */
  async getPlatformVotingAnalytics(timeRange?: AnalyticsTimeRange): Promise<PlatformVotingAnalytics> {
    return platformAnalyticsDataService.getPlatformVotingAnalytics({ timeRange });
  }

  /**
   * Delegate system health metrics retrieval.
   */
  async getSystemHealthMetrics() {
    return systemHealthService.getSystemHealthMetrics();
  }

  private normalizeReportType(reportType: string): AnalyticsReportType {
    switch (reportType) {
      case 'monthly-summary':
      case 'product-performance':
      case 'voting-trends':
        return reportType;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }
}

export const optimizedAnalyticsService = new AnalyticsService();
