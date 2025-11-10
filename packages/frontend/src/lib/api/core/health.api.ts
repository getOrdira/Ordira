// src/lib/api/core/health.api.ts
// Health check API module aligned with backend routes/core/health.routes.ts

import Joi from 'joi';

import { publicApi } from '../client';
import baseApi from './base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';

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

const serviceStatusSchema = Joi.string().valid('healthy', 'unhealthy', 'degraded');

const basicHealthSchema = Joi.object<BasicHealthResponse>({
  status: serviceStatusSchema.required(),
  timestamp: Joi.string().isoDate().required(),
  uptime: Joi.number().integer().min(0).optional()
});

const detailedHealthSchema = Joi.object<DetailedHealthResponse>({
  status: serviceStatusSchema.required(),
  timestamp: Joi.string().isoDate().required(),
  uptime: Joi.number().integer().min(0).optional(),
  services: Joi.object()
    .pattern(
      Joi.string(),
      Joi.alternatives().try(
        serviceStatusSchema,
        Joi.object().unknown(true)
      )
    )
    .required(),
  version: Joi.string().optional(),
  environment: Joi.string().optional()
});

const readinessSchema = Joi.object<ReadinessResponse>({
  ready: Joi.boolean().required(),
  checks: Joi.object()
    .pattern(Joi.string(), Joi.boolean())
    .required()
});

const livenessSchema = Joi.object<LivenessResponse>({
  alive: Joi.boolean().required(),
  timestamp: Joi.string().isoDate().required()
});

const createHealthContext = (endpoint: string) => ({
  method: 'GET' as const,
  endpoint
});

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
      const payload = baseApi.handleResponse(response, 'Health check failed', 500);
      return baseApi.validatePayload(basicHealthSchema, payload);
    } catch (error: unknown) {
      throw handleApiError(error, createHealthContext('/health'));
    }
  },

  /**
   * Detailed health check
   * GET /health/detailed
   */
  detailedHealth: async (): Promise<DetailedHealthResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<DetailedHealthResponse>>('/health/detailed');
      const payload = baseApi.handleResponse(response, 'Detailed health check failed', 500);
      return baseApi.validatePayload(detailedHealthSchema, payload);
    } catch (error: unknown) {
      throw handleApiError(error, createHealthContext('/health/detailed'));
    }
  },

  /**
   * Readiness check
   * GET /health/ready
   */
  readiness: async (): Promise<ReadinessResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<ReadinessResponse>>('/health/ready');
      const payload = baseApi.handleResponse(response, 'Readiness check failed', 500);
      return baseApi.validatePayload(readinessSchema, payload);
    } catch (error: unknown) {
      throw handleApiError(error, createHealthContext('/health/ready'));
    }
  },

  /**
   * Liveness check
   * GET /health/live
   */
  liveness: async (): Promise<LivenessResponse> => {
    try {
      const response = await publicApi.get<ApiResponse<LivenessResponse>>('/health/live');
      const payload = baseApi.handleResponse(response, 'Liveness check failed', 500);
      return baseApi.validatePayload(livenessSchema, payload);
    } catch (error: unknown) {
      throw handleApiError(error, createHealthContext('/health/live'));
    }
  },
};

// Export as default for convenience
export default healthApi;

