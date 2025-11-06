// src/lib/api/core/health.api.ts
// Health check API module aligned with backend routes/core/health.routes.ts

import { api, publicApi } from '../client';
import type { ApiResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors';

/**
 * Health check response types
 */
export interface BasicHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
}

export interface DetailedHealthResponse extends BasicHealthResponse {
  services: {
    database: 'healthy' | 'unhealthy' | 'degraded';
    redis: 'healthy' | 'unhealthy' | 'degraded';
    s3: 'healthy' | 'unhealthy' | 'degraded';
    [key: string]: 'healthy' | 'unhealthy' | 'degraded' | any;
  };
  version?: string;
  environment?: string;
}

export interface ReadinessResponse {
  ready: boolean;
  checks: {
    database: boolean;
    redis: boolean;
    [key: string]: boolean | any;
  };
}

export interface LivenessResponse {
  alive: boolean;
  timestamp: string;
}

/**
 * Health Check API
 * 
 * Handles system health check endpoints.
 * Routes: /health/*
 */
export const healthApi = {
  
  /**
   * Basic health check
   * GET /health
   */
  basicHealth: async (): Promise<BasicHealthResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<BasicHealthResponse>>('/health');
      if (!response.success) {
        throw new ApiError(response.message || 'Health check failed',  500);
      }
      return response.data!;
    } catch (error) {
      console.error('Basic health check error:', error);
      throw error;
    }
  },

  /**
   * Detailed health check
   * GET /health/detailed
   */
  detailedHealth: async (): Promise<DetailedHealthResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<DetailedHealthResponse>>('/health/detailed');
      if (!response.success) {
        throw new ApiError(response.message || 'Detailed health check failed',  500);
      }
      return response.data!;
    } catch (error) {
      console.error('Detailed health check error:', error);
      throw error;
    }
  },

  /**
   * Readiness check
   * GET /health/ready
   */
  readiness: async (): Promise<ReadinessResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<ReadinessResponse>>('/health/ready');
      if (!response.success) {
        throw new ApiError(response.message || 'Readiness check failed',  500);
      }
      return response.data!;
    } catch (error) {
      console.error('Readiness check error:', error);
      throw error;
    }
  },

  /**
   * Liveness check
   * GET /health/live
   */
  liveness: async (): Promise<LivenessResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<LivenessResponse>>('/health/live');
      if (!response.success) {
        throw new ApiError(response.message || 'Liveness check failed',  500);
      }
      return response.data!;
    } catch (error) {
      console.error('Liveness check error:', error);
      throw error;
    }
  },
};

// Export as default for convenience
export default healthApi;

