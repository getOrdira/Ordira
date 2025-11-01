// src/controllers/features/analytics/analyticsSystemHealth.controller.ts
// Controller exposing system health analytics operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';

/**
 * AnalyticsSystemHealthController returns cached system health metrics.
 */
export class AnalyticsSystemHealthController extends AnalyticsBaseController {
  /**
   * Retrieve current system health metrics snapshot.
   */
  async getSystemHealthMetrics(req: AnalyticsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_SYSTEM_HEALTH');

      const metrics = await this.systemHealthService.getSystemHealthMetrics();

      this.logAction(req, 'ANALYTICS_SYSTEM_HEALTH_SUCCESS', {
        totalUsers: metrics.totalUsers,
        activeUsers: metrics.activeUsers
      });

      return {
        metrics,
        generatedAt: new Date().toISOString()
      };
    }, res, 'System health metrics retrieved successfully', this.getRequestMeta(req));
  }
}

export const analyticsSystemHealthController = new AnalyticsSystemHealthController();

