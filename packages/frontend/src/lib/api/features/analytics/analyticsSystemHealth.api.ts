// src/lib/api/features/analytics/analyticsSystemHealth.api.ts
// Analytics system health API module aligned with backend routes/features/analytics/analyticsSystemHealth.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { SystemHealthMetrics } from '@/lib/types/features/analytics';

export interface SystemHealthResponse {
  metrics: SystemHealthMetrics;
  generatedAt: string;
}

/**
 * Analytics System Health API
 *
 * Handles system health metrics endpoints.
 * Routes: /api/analytics/health/*
 */
export const analyticsSystemHealthApi = {
  /**
   * Retrieve cached system health metrics snapshot.
   * GET /api/analytics/health
   */
  async getSystemHealthMetrics(): Promise<SystemHealthResponse> {
    try {
      const response = await api.get<ApiResponse<SystemHealthResponse>>(
        '/analytics/health',
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch system health metrics',
        500,
      );
    } catch (error) {
      console.error('System health metrics fetch error:', error);
      throw error;
    }
  },
};

export default analyticsSystemHealthApi;

