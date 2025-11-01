// src/controllers/features/analytics/analyticsReporting.controller.ts
// Controller exposing reporting data operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';

interface ReplicaDashboardRequest extends AnalyticsBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface BusinessReportRequest extends AnalyticsBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    reportType?: string;
    startDate?: string;
    endDate?: string;
    includeRawData?: boolean;
    useReplica?: boolean;
  };
  validatedBody?: {
    reportType?: string;
    includeRawData?: boolean;
    useReplica?: boolean;
  };
}

/**
 * AnalyticsReportingController maps HTTP requests to reporting data services.
 */
export class AnalyticsReportingController extends AnalyticsBaseController {
  /**
   * Retrieve dashboard analytics using the read replica for heavy workloads.
   */
  async getDashboardAnalyticsWithReplica(req: ReplicaDashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_REPORTING_REPLICA_DASHBOARD');

      const businessId = this.resolveBusinessId(req, true) as string;
      const timeRange = this.extractTimeRange(req);

      const analytics = await this.reportingDataService.getDashboardAnalyticsWithReplica(
        businessId,
        timeRange
      );

      this.logAction(req, 'ANALYTICS_REPORTING_REPLICA_DASHBOARD_SUCCESS', {
        businessId,
        hasTimeRange: Boolean(timeRange)
      });

      return {
        businessId,
        analytics,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Replica dashboard analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve business reporting payload with optional raw data.
   */
  async getBusinessReportingData(req: BusinessReportRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_REPORTING_BUSINESS_DATA');

      const reportRequest = this.buildReportRequest(req);

      const payload = await this.reportingDataService.getBusinessReportingData(reportRequest);

      this.logAction(req, 'ANALYTICS_REPORTING_BUSINESS_DATA_SUCCESS', {
        businessId: reportRequest.businessId,
        reportType: reportRequest.reportType,
        includeRawData: reportRequest.includeRawData,
        useReplica: reportRequest.useReplica
      });

      return {
        report: payload,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Business analytics report generated successfully', this.getRequestMeta(req));
  }
}

export const analyticsReportingController = new AnalyticsReportingController();

