// src/lib/api/features/analytics/analyticsReporting.api.ts
// Analytics reporting API module aligned with backend routes/features/analytics/analyticsReporting.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AnalyticsReportPayload,
  AnalyticsReportType,
} from '@/lib/types/features/analytics';

export interface DashboardReplicaTimelineEntry {
  date: string;
  totalVotes: number;
  uniqueVoters: number;
  products: number;
}

export interface DashboardReplicaSummary {
  totalProducts: number;
  totalVotes: number;
  totalCertificates: number;
  totalViews: number;
  avgPrice: number;
}

export interface DashboardReplicaAnalytics {
  timeline: DashboardReplicaTimelineEntry[];
  summary: DashboardReplicaSummary;
  executionTime: number;
  source: 'read-replica';
}

export interface DashboardReplicaResponse {
  businessId: string;
  analytics: DashboardReplicaAnalytics;
  generatedAt: string;
}

export interface BusinessReportingParams {
  reportType: AnalyticsReportType;
  startDate?: string | Date;
  endDate?: string | Date;
  includeRawData?: boolean;
  useReplica?: boolean;
}

export interface BusinessReportingResponse {
  report: AnalyticsReportPayload;
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
 * Analytics Reporting API
 *
 * Handles reporting data endpoints.
 * Routes: /api/analytics/reporting/*
 */
export const analyticsReportingApi = {
  /**
   * Fetch dashboard analytics from the read replica.
   * GET /api/analytics/reporting/business/:businessId/dashboard
   */
  async getDashboardAnalyticsWithReplica(
    businessId: string,
    params?: { startDate?: string | Date; endDate?: string | Date },
  ): Promise<DashboardReplicaResponse> {
    try {
      const query = sanitizeQuery({
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
      });

      const response = await api.get<ApiResponse<DashboardReplicaResponse>>(
        `/analytics/reporting/business/${encodeURIComponent(businessId)}/dashboard`,
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch replica dashboard analytics',
        500,
      );
    } catch (error) {
      console.error('Replica dashboard analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch business reporting payload from read replica.
   * GET /api/analytics/reporting/business/:businessId/report
   */
  async getBusinessReportingData(
    businessId: string,
    params: BusinessReportingParams,
  ): Promise<BusinessReportingResponse> {
    try {
      if (!params?.reportType) {
        throw new Error('reportType is required to fetch reporting data');
      }

      const query = sanitizeQuery({
        reportType: params.reportType,
        startDate: toIsoString(params.startDate),
        endDate: toIsoString(params.endDate),
        includeRawData: params.includeRawData,
        useReplica: params.useReplica,
      });

      const response = await api.get<ApiResponse<BusinessReportingResponse>>(
        `/analytics/reporting/business/${encodeURIComponent(businessId)}/report`,
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch business reporting data',
        500,
      );
    } catch (error) {
      console.error('Business reporting data fetch error:', error);
      throw error;
    }
  },
};

export default analyticsReportingApi;

