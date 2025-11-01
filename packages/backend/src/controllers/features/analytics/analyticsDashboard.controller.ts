// src/controllers/features/analytics/analyticsDashboard.controller.ts
// Controller exposing dashboard aggregation operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';

interface DashboardAnalyticsRequest extends AnalyticsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    groupBy?: string;
    startDate?: string;
    endDate?: string;
    includeSystemHealth?: boolean;
    useReadReplica?: boolean;
  };
}

/**
 * AnalyticsDashboardController maps HTTP requests to dashboard aggregation services.
 */
export class AnalyticsDashboardController extends AnalyticsBaseController {
  /**
   * Retrieve composed dashboard analytics snapshot with optional read replica support.
   */
  async getDashboardAnalytics(req: DashboardAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_DASHBOARD_SNAPSHOT');

      const businessId = this.resolveBusinessId(req);
      const manufacturerId = this.resolveManufacturerId(req);
      const timeRange = this.extractTimeRange(req);
      const groupBy = this.parseGrouping(
        req.validatedQuery?.groupBy ?? (req.query as any)?.groupBy
      );
      const includeSystemHealth =
        req.validatedQuery?.includeSystemHealth ??
        this.parseOptionalBoolean((req.query as any)?.includeSystemHealth) ??
        true;
      const useReadReplica =
        req.validatedQuery?.useReadReplica ??
        this.parseOptionalBoolean((req.query as any)?.useReadReplica) ??
        false;

      const snapshot = await this.dashboardAggregationService.getDashboardAnalytics({
        businessId,
        manufacturerId,
        timeRange,
        groupBy,
        includeSystemHealth,
        useReadReplica
      });

      this.logAction(req, 'ANALYTICS_DASHBOARD_SNAPSHOT_SUCCESS', {
        businessId,
        manufacturerId,
        includeSystemHealth,
        useReadReplica,
        groupBy,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        snapshot,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Dashboard analytics snapshot retrieved successfully', this.getRequestMeta(req));
  }
}

export const analyticsDashboardController = new AnalyticsDashboardController();

