// src/lib/api/features/brands/brandProfile.api.ts
// Brand Profile API module aligned with backend routes/features/brands/brandProfile.routes.ts

import { api, publicApi } from '../../client';
import baseApi from '../../core/base.api';
import type { BrandProfile, BrandProfileSummary } from '@/lib/types/features/brands';
import type { ApiResponse, PaginatedResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createBrandLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'brands',
  method,
  endpoint,
  ...context
});

const VOID_RESPONSE_OPTIONS = { requireData: false } as const;

/**
 * Brand Profile API
 * 
 * Handles all brand profile-related API calls.
 * Routes: /api/brands/profile/*
 */
export const brandProfileApi = {
  
  /**
   * Get trending brands
   * GET /api/brands/profile/trending
   */
  getTrendingBrands: async (params?: {
    limit?: number;
    timeframe?: '24h' | '7d' | '30d';
  }): Promise<BrandProfileSummary[]> => {
    try {
      const response = await publicApi.get<ApiResponse<BrandProfileSummary[]>>(
        '/api/brands/profile/trending',
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch trending brands',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/trending', params)
      );
    }
  },

  /**
   * Get featured brands
   * GET /api/brands/profile/featured
   */
  getFeaturedBrands: async (params?: {
    limit?: number;
  }): Promise<BrandProfileSummary[]> => {
    try {
      const response = await publicApi.get<ApiResponse<BrandProfileSummary[]>>(
        '/api/brands/profile/featured',
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch featured brands',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/featured', params)
      );
    }
  },

  /**
   * Search brands
   * GET /api/brands/profile/search
   */
  searchBrands: async (params: {
    query: string;
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
  }): Promise<PaginatedResponse<BrandProfileSummary>> => {
    try {
      const response = await publicApi.get<ApiResponse<PaginatedResponse<BrandProfileSummary>>>(
        '/api/brands/profile/search',
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Brand search failed',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/search', { query: params.query })
      );
    }
  },

  /**
   * List brand profiles
   * GET /api/brands/profile
   */
  listBrandProfiles: async (params?: {
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
    verified?: boolean;
    plan?: string;
    sortBy?: 'name' | 'created' | 'popularity' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }): Promise<PaginatedResponse<BrandProfileSummary>> => {
    try {
      const response = await publicApi.get<ApiResponse<PaginatedResponse<BrandProfileSummary>>>(
        '/api/brands/profile',
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to list brands',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile', params)
      );
    }
  },

  /**
   * Get brand by domain
   * GET /api/brands/profile/domain/:domain
   */
  getBrandByDomain: async (domain: string): Promise<BrandProfile> => {
    try {
      const response = await publicApi.get<ApiResponse<BrandProfile>>(
        `/api/brands/profile/domain/${encodeURIComponent(domain)}`
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand by domain',
        404
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/domain/:domain', { domain })
      );
    }
  },

  /**
   * Get brand by subdomain
   * GET /api/brands/profile/subdomain/:subdomain
   */
  getBrandBySubdomain: async (subdomain: string): Promise<BrandProfile> => {
    try {
      const response = await publicApi.get<ApiResponse<BrandProfile>>(
        `/api/brands/profile/subdomain/${encodeURIComponent(subdomain)}`
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand by subdomain',
        404
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/subdomain/:subdomain', { subdomain })
      );
    }
  },

  /**
   * Get brand by ID
   * GET /api/brands/profile/:brandId
   */
  getBrandById: async (brandId: string, params?: {
    includeAnalytics?: boolean;
    includeConnections?: boolean;
  }): Promise<BrandProfile> => {
    try {
      const response = await publicApi.get<ApiResponse<BrandProfile>>(
        `/api/brands/profile/${brandId}`,
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand',
        404
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/:brandId', { brandId, ...params })
      );
    }
  },

  /**
   * Get brand analytics
   * GET /api/brands/profile/:brandId/analytics
   */
  getBrandAnalytics: async (brandId: string, params?: {
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    metrics?: string[];
  }): Promise<any> => {
    try {
      const response = await api.get<ApiResponse<any>>(
        `/api/brands/profile/${brandId}/analytics`,
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/:brandId/analytics', { brandId, ...params })
      );
    }
  },

  /**
   * Get brand connections
   * GET /api/brands/profile/:brandId/connections
   */
  getBrandConnections: async (brandId: string, params?: {
    page?: number;
    limit?: number;
    type?: 'sent' | 'received' | 'accepted' | 'pending';
  }): Promise<PaginatedResponse<any>> => {
    try {
      const response = await api.get<ApiResponse<PaginatedResponse<any>>>(
        `/api/brands/profile/${brandId}/connections`,
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand connections',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/:brandId/connections', { brandId, ...params })
      );
    }
  },

  /**
   * Get brand recommendations
   * GET /api/brands/profile/:brandId/recommendations
   */
  getBrandRecommendations: async (brandId: string, params?: {
    type?: 'connections' | 'products' | 'features';
    limit?: number;
  }): Promise<any[]> => {
    try {
      const response = await api.get<ApiResponse<any[]>>(
        `/api/brands/profile/${brandId}/recommendations`,
        { params: baseApi.sanitizeQueryParams(params) }
      );
      return baseApi.handleResponse(
        response,
        'Failed to fetch brand recommendations',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/:brandId/recommendations', { brandId, ...params })
      );
    }
  },

  /**
   * Track brand view
   * GET /api/brands/profile/:brandId/view
   */
  trackBrandView: async (brandId: string): Promise<void> => {
    try {
      const response = await api.get<ApiResponse<void>>(
        `/api/brands/profile/${brandId}/view`
      );
      baseApi.handleResponse(
        response,
        'Failed to track brand view',
        500,
        VOID_RESPONSE_OPTIONS
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', '/api/brands/profile/:brandId/view', { brandId })
      );
    }
  },
};

// Export as default for convenience
export default brandProfileApi;

