import { reportingDataService } from '../core/reportingData.service';
import type { AnalyticsReportPayload, AnalyticsReportRequest } from '../utils/types';

/**
 * High level report generation helpers that build human consumable outputs from reporting payloads.
 */
export class ReportGenerationService {
  /**
   * Generate a full analytics report payload with raw data for downstream formatting.
   */
  async generateReport(request: AnalyticsReportRequest): Promise<AnalyticsReportPayload> {
    return reportingDataService.getBusinessReportingData({
      ...request,
      includeRawData: true
    });
  }

  /**
   * Format a report payload as JSON string.
   */
  formatReportAsJson(payload: AnalyticsReportPayload): string {
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Format report summary as CSV for quick exports.
   */
  formatReportSummaryAsCsv(payload: AnalyticsReportPayload): string {
    const rows = Object.entries(payload.summary || {}).map(([key, value]) => {
      return `${this.sanitizeCsvValue(key)},${this.sanitizeCsvValue(value)}`;
    });

    return ['Metric,Value', ...rows].join('\n');
  }

  private sanitizeCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}

export const reportGenerationService = new ReportGenerationService();
