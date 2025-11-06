// src/lib/api/features/analytics/analyticsReportGeneration.api.ts
// Analytics report generation API module aligned with backend routes/features/analytics/analyticsReportGeneration.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AnalyticsReportPayload,
  AnalyticsReportRequest,
  AnalyticsReportType,
} from '@/lib/types/features/analytics';

export type AnalyticsReportFormat = 'payload' | 'json' | 'csv';

export interface GenerateAnalyticsReportOptions<Format extends AnalyticsReportFormat = 'payload'> {
  reportType: AnalyticsReportType;
  format?: Format;
  startDate?: string | Date;
  endDate?: string | Date;
  includeRawData?: boolean;
  useReplica?: boolean;
}

export type GenerateAnalyticsReportResponse<Format extends AnalyticsReportFormat = 'payload'> = {
  businessId: string;
  reportType: AnalyticsReportType;
  format: Format;
  generatedAt: string;
} & (Format extends 'payload'
  ? { report: AnalyticsReportPayload }
  : { report: string });

interface AnalyticsReportGenerationBaseResponse {
  businessId: string;
  reportType: AnalyticsReportType;
  format: AnalyticsReportFormat;
  report: AnalyticsReportPayload | string;
  generatedAt: string;
}

const toIsoString = (value?: string | Date): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Analytics Report Generation API
 *
 * Handles report generation endpoints.
 * Routes: /api/analytics/reports/*
 */
export const analyticsReportGenerationApi = {
  /**
   * Generate a business analytics report with optional formatting.
   * POST /api/analytics/reports/business/:businessId
   */
  async generateReport<Format extends AnalyticsReportFormat = 'payload'>(
    businessId: string,
    options: GenerateAnalyticsReportOptions<Format>,
  ): Promise<GenerateAnalyticsReportResponse<Format>> {
    try {
      if (!options?.reportType) {
        throw new Error('reportType is required to generate a report');
      }

      const query = sanitizeQuery({
        startDate: toIsoString(options.startDate),
        endDate: toIsoString(options.endDate),
        includeRawData: options.includeRawData,
        useReplica: options.useReplica,
        format: options.format,
      });

      const body: Partial<AnalyticsReportRequest> & {
        reportType: AnalyticsReportType;
        format?: AnalyticsReportFormat;
        includeRawData?: boolean;
        useReplica?: boolean;
      } = {
        reportType: options.reportType,
        includeRawData: options.includeRawData,
        useReplica: options.useReplica,
        format: options.format,
      };

      const response = await api.post<ApiResponse<AnalyticsReportGenerationBaseResponse>>(
        `/analytics/reports/business/${encodeURIComponent(businessId)}`,
        body,
        { params: query },
      );

      const payload = baseApi.handleResponse(
        response,
        'Failed to generate analytics report',
        500,
      );

      return payload as unknown as GenerateAnalyticsReportResponse<Format>;
    } catch (error) {
      console.error('Analytics report generation error:', error);
      throw error;
    }
  },
};

export default analyticsReportGenerationApi;

