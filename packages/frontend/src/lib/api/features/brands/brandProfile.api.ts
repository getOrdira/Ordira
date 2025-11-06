// src/lib/api/features/brands/brandProfile.api.ts
// Brand Profile API module aligned with backend routes/features/brands/brandProfile.routes.ts

import { api, publicApi } from '../../client';
import type { BrandProfile, BrandProfileSummary } from '@/lib/types/features/brands';
import type { ApiResponse, PaginatedResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors';

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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch trending brands', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Get trending brands error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch featured brands', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Get featured brands error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Brand search failed', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Search brands error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to list brands', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('List brands error:', error);
      throw error;
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
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand by domain', response.statusCode || 404);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand by domain error:', error);
      throw error;
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
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand by subdomain', response.statusCode || 404);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand by subdomain error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand', response.statusCode || 404);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand by ID error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand analytics', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand analytics error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand connections', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand connections error:', error);
      throw error;
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
        { params }
      );
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to fetch brand recommendations', response.statusCode || 500);
      }
      return response.data!;
    } catch (error) {
      console.error('Get brand recommendations error:', error);
      throw error;
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
      if (!response.success) {
        throw new ApiError(response.message || 'Failed to track brand view', response.statusCode || 500);
      }
    } catch (error) {
      console.error('Track brand view error:', error);
      throw error;
    }
  },
};

// Export as default for convenience
export default brandProfileApi;

