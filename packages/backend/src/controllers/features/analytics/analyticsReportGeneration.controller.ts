// src/controllers/features/analytics/analyticsReportGeneration.controller.ts
// Controller exposing analytics report generation and formatting operations

import { Response } from 'express';
import { AnalyticsBaseController, AnalyticsBaseRequest } from './analyticsBase.controller';

type ReportFormat = 'payload' | 'json' | 'csv';

interface ReportGenerationRequest extends AnalyticsBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    reportType?: string;
    format?: ReportFormat | string;
    startDate?: string;
    endDate?: string;
    includeRawData?: boolean;
    useReplica?: boolean;
  };
  validatedBody?: {
    reportType?: string;
    format?: ReportFormat | string;
    includeRawData?: boolean;
    useReplica?: boolean;
  };
}

/**
 * AnalyticsReportGenerationController provides high-level report generation endpoints.
 */
export class AnalyticsReportGenerationController extends AnalyticsBaseController {
  /**
   * Generate analytics report payloads with optional formatting helpers.
   */
  async generateReport(req: ReportGenerationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'ANALYTICS_REPORT_GENERATION');

      const formatInput =
        this.parseString(req.validatedQuery?.format) ??
        this.parseString(req.validatedBody?.format) ??
        this.parseString((req.body as any)?.format) ??
        this.parseString((req.query as any)?.format);

      const format: ReportFormat =
        formatInput === 'json' || formatInput === 'csv' ? formatInput : 'payload';

      const reportRequest = this.buildReportRequest(req);

      const payload = await this.reportGenerationService.generateReport(reportRequest);

      let content: unknown = payload;
      if (format === 'json') {
        content = this.reportGenerationService.formatReportAsJson(payload);
      } else if (format === 'csv') {
        content = this.reportGenerationService.formatReportSummaryAsCsv(payload);
      }

      this.logAction(req, 'ANALYTICS_REPORT_GENERATION_SUCCESS', {
        businessId: reportRequest.businessId,
        reportType: reportRequest.reportType,
        format,
        includeRawData: reportRequest.includeRawData,
        useReplica: reportRequest.useReplica
      });

      return {
        businessId: reportRequest.businessId,
        reportType: reportRequest.reportType,
        format,
        report: content,
        generatedAt: new Date().toISOString()
      };
    }, res, 'Analytics report generated successfully', this.getRequestMeta(req));
  }
}

export const analyticsReportGenerationController = new AnalyticsReportGenerationController();
