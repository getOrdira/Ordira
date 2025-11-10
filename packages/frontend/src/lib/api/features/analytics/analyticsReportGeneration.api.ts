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
import { ApiError } from '@/lib/errors/errors';
import { handleApiError } from '@/lib/validation/middleware/apiError';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'analytics',
  method,
  endpoint,
  ...context,
});

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
        throw new ApiError('reportType is required to generate a report', 400, 'VALIDATION_ERROR', {
          businessId,
        });
      }

      const query = baseApi.sanitizeQueryParams({
        startDate: options.startDate,
        endDate: options.endDate,
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

      const requestBody = baseApi.sanitizeRequestData(body);

      const response = await api.post<ApiResponse<AnalyticsReportGenerationBaseResponse>>(
        `/analytics/reports/business/${encodeURIComponent(businessId)}`,
        requestBody,
        { params: query },
      );

      const apiPayload = baseApi.handleResponse(
        response,
        'Failed to generate analytics report',
        500,
      );

      return apiPayload as unknown as GenerateAnalyticsReportResponse<Format>;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext(
          'POST',
          `/analytics/reports/business/${encodeURIComponent(businessId)}`,
          {
            businessId,
            reportType: options?.reportType,
            format: options?.format,
          },
        ),
      );
    }
  },
};

export default analyticsReportGenerationApi;

