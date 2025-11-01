// src/controllers/features/analytics/analyticsInsights.controller.ts
// Controller exposing narrative analytics insights operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';

interface AnalyticsInsightsRequest extends AnalyticsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    groupBy?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  };
}

/**
 * AnalyticsInsightsController generates human-readable insights derived from dashboard snapshots.
 */
export class AnalyticsInsightsController extends AnalyticsBaseController {
  /**
   * Generate dashboard insights by composing a fresh analytics snapshot.
   */
  async generateDashboardInsights(req: AnalyticsInsightsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_INSIGHTS_GENERATE');

      const businessId = this.resolveBusinessId(req);
      const manufacturerId = this.resolveManufacturerId(req);
      const timeRange = this.extractTimeRange(req);
      const groupBy = this.parseGrouping(
        req.validatedQuery?.groupBy ?? (req.query as any)?.groupBy
      );
      const limit = this.parseOptionalNumber(
        req.validatedQuery?.limit ?? (req.query as any)?.limit,
        { min: 1, max: 50 }
      );

      const snapshot = await this.dashboardAggregationService.getDashboardAnalytics({
        businessId,
        manufacturerId,
        timeRange,
        groupBy,
        includeSystemHealth: true,
        useReadReplica: false
      });

      const insights = this.platformInsightsService.generateInsights(snapshot);
      const limitedInsights = limit ? insights.slice(0, limit) : insights;

      this.logAction(req, 'ANALYTICS_INSIGHTS_GENERATE_SUCCESS', {
        businessId,
        manufacturerId,
        groupBy,
        limit,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        insights: limitedInsights,
        snapshotGeneratedAt: snapshot.updatedAt,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Analytics insights generated successfully', this.getRequestMeta(req));
  }
}

export const analyticsInsightsController = new AnalyticsInsightsController();

