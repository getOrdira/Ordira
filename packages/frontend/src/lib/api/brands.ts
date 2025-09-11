// src/lib/api/brands.ts

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from './client';
import { BrandSettings } from '@/lib/types/brand';
import { ApiError } from '@/lib/errors';

// Enhanced response interfaces matching backend controller responses
export interface BrandProfileResponse {
  success: boolean;
  profile: BrandSettings;
}

export interface BrandProfileDetailResponse {
  success: boolean;
  data: {
    profile: BrandSettings;
    analytics: {
      totalViews: number;
      totalVotes: number;
      popularProducts: any[];
    };
    relatedBrands: BrandSettings[];
  };
  metadata: {
    viewTracked: boolean;
    generatedAt: Date;
  };
}

export interface BrandSearchResponse {
  query: string;
  results: BrandSettings[];
  totalResults: number;
}

export interface PublicBrandProfile {
  _id: string;
  companyName: string;
  description?: string;
  industry?: string;
  logoUrl?: string;
  website?: string;
  socialUrls?: string[];
  profilePictureUrl?: string;
  companySize?: string;
  yearEstablished?: number;
  publicMetrics: {
    totalProducts: number;
    totalVotes: number;
    avgRating: number;
    verifiedStatus: boolean;
  };
}

export const brandsApi = {
  
  // ===== BRAND DISCOVERY =====
  
  /**
   * Get brand by subdomain
   * GET /api/brands/subdomain/:subdomain
   */
  getBrandBySubdomain: async (subdomain: string): Promise<BrandProfileResponse> => {
    try {
      const response = await api.get<BrandProfileResponse>(
        `/api/brands/subdomain/${encodeURIComponent(subdomain)}`
      );
      return response;
    } catch (error) {
      console.error('Get brand by subdomain error:', error);
      throw error;
    }
  },

  /**
   * Get brand by custom domain
   * GET /api/brands/domain/:domain
   */
  getBrandByDomain: async (domain: string): Promise<BrandProfileResponse> => {
    try {
      const response = await api.get<BrandProfileResponse>(
        `/api/brands/domain/${encodeURIComponent(domain)}`
      );
      return response;
    } catch (error) {
      console.error('Get brand by domain error:', error);
      throw error;
    }
  },

  /**
   * Get detailed brand profile by ID
   * GET /api/brands/:id
   */
  getBrandProfile: async (brandId: string): Promise<BrandProfileDetailResponse> => {
    try {
      const response = await api.get<BrandProfileDetailResponse>(
        `/api/brands/${brandId}`
      );
      return response;
    } catch (error) {
      console.error('Get brand profile error:', error);
      throw error;
    }
  },

  /**
   * Get public brand profile (for manufacturers/visitors)
   * GET /api/brands/profile/public/:brandId
   */
  getPublicBrandProfile: async (brandId: string): Promise<{
    profile: PublicBrandProfile;
    canConnect: boolean;
    connectionStatus?: string;
  }> => {
    try {
      const response = await api.get<{
        profile: PublicBrandProfile;
        canConnect: boolean;
        connectionStatus?: string;
      }>(`/api/brands/profile/public/${brandId}`);
      return response;
    } catch (error) {
      console.error('Get public brand profile error:', error);
      throw error;
    }
  },

  /**
   * Search brand profiles
   * GET /api/brands/search
   */
  searchBrands: async (query: string, filters?: {
    industry?: string;
    companySize?: string;
    location?: string;
    page?: number;
    limit?: number;
  }): Promise<BrandSearchResponse> => {
    try {
      const params = new URLSearchParams({ search: query });
      if (filters?.industry) params.set('industry', filters.industry);
      if (filters?.companySize) params.set('companySize', filters.companySize);
      if (filters?.location) params.set('location', filters.location);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));

      const response = await api.get<BrandSearchResponse>(
        `/api/brands/search?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Search brands error:', error);
      throw error;
    }
  },

  // ===== BRAND PROFILE MANAGEMENT =====
  
  /**
   * Get current brand profile
   * GET /api/brands/profile
   */
  getCurrentBrandProfile: async (): Promise<BrandSettings> => {
    try {
      const response = await api.get<BrandSettings>('/api/brands/profile');
      return response;
    } catch (error) {
      console.error('Get current brand profile error:', error);
      throw error;
    }
  },

  /**
   * Update brand profile
   * PUT /api/brands/profile
   */
  updateBrandProfile: async (data: Partial<BrandSettings>): Promise<BrandSettings> => {
    try {
      const response = await api.put<BrandSettings>('/api/brands/profile', data);
      return response;
    } catch (error) {
      console.error('Update brand profile error:', error);
      throw error;
    }
  },

  /**
   * Get profile completion status
   * GET /api/brands/profile/completeness
   */
  getProfileCompleteness: async (): Promise<{
    completionPercentage: number;
    missingFields: string[];
    recommendations: string[];
    criticalMissing: string[];
  }> => {
    try {
      const response = await api.get<{
        completionPercentage: number;
        missingFields: string[];
        recommendations: string[];
        criticalMissing: string[];
      }>('/api/brands/profile/completeness');
      return response;
    } catch (error) {
      console.error('Get profile completeness error:', error);
      throw error;
    }
  },

  /**
   * Upload profile assets (logo, banner, gallery)
   * POST /api/brands/profile/upload-assets
   */
  uploadProfileAssets: async (formData: FormData): Promise<{
    uploaded: Array<{
      type: 'logo' | 'banner' | 'gallery';
      url: string;
      filename: string;
    }>;
    errors: string[];
  }> => {
    try {
      const response = await api.postFormData<{
        uploaded: Array<{
          type: 'logo' | 'banner' | 'gallery';
          url: string;
          filename: string;
        }>;
        errors: string[];
      }>('/api/brands/profile/upload-assets', formData);
      return response;
    } catch (error) {
      console.error('Upload profile assets error:', error);
      throw error;
    }
  },

  /**
   * Remove profile asset
   * DELETE /api/brands/profile/assets/:assetId
   */
  removeProfileAsset: async (assetId: string): Promise<void> => {
    try {
      await api.delete<void>(`/api/brands/profile/assets/${assetId}`);
    } catch (error) {
      console.error('Remove profile asset error:', error);
      throw error;
    }
  },

  // ===== ANALYTICS AND INSIGHTS =====
  
  /**
   * Get profile analytics
   * GET /api/brands/profile/analytics
   */
  getProfileAnalytics: async (timeRange?: {
    start?: string;
    end?: string;
  }): Promise<{
    views: {
      total: number;
      unique: number;
      trend: number;
      bySource: Array<{ source: string; count: number }>;
    };
    engagement: {
      profileViews: number;
      connectionRequests: number;
      averageTimeOnProfile: number;
    };
    performance: {
      searchRanking: number;
      profileScore: number;
      industryPosition: number;
    };
  }> => {
    try {
      const params = new URLSearchParams();
      if (timeRange?.start) params.set('start', timeRange.start);
      if (timeRange?.end) params.set('end', timeRange.end);

      const response = await api.get<{
        views: {
          total: number;
          unique: number;
          trend: number;
          bySource: Array<{ source: string; count: number }>;
        };
        engagement: {
          profileViews: number;
          connectionRequests: number;
          averageTimeOnProfile: number;
        };
        performance: {
          searchRanking: number;
          profileScore: number;
          industryPosition: number;
        };
      }>(`/api/brands/profile/analytics?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Get profile analytics error:', error);
      throw error;
    }
  },

  /**
   * Get AI recommendations for profile improvement
   * GET /api/brands/profile/recommendations
   */
  getProfileRecommendations: async (): Promise<{
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      estimatedImpact: number;
    }>;
    nextActions: string[];
  }> => {
    try {
      const response = await api.get<{
        recommendations: Array<{
          category: string;
          title: string;
          description: string;
          priority: 'high' | 'medium' | 'low';
          estimatedImpact: number;
        }>;
        nextActions: string[];
      }>('/api/brands/profile/recommendations');
      return response;
    } catch (error) {
      console.error('Get profile recommendations error:', error);
      throw error;
    }
  },

  // ===== SOCIAL AND NETWORKING =====
  
  /**
   * Get social media presence
   * GET /api/brands/profile/social
   */
  getSocialPresence: async (): Promise<{
    platforms: Array<{
      platform: string;
      url: string;
      verified: boolean;
      followers?: number;
    }>;
    socialScore: number;
  }> => {
    try {
      const response = await api.get<{
        platforms: Array<{
          platform: string;
          url: string;
          verified: boolean;
          followers?: number;
        }>;
        socialScore: number;
      }>('/api/brands/profile/social');
      return response;
    } catch (error) {
      console.error('Get social presence error:', error);
      throw error;
    }
  },

  /**
   * Update social media links
   * PUT /api/brands/profile/social
   */
  updateSocialPresence: async (data: {
    platforms: Array<{
      platform: string;
      url: string;
    }>;
  }): Promise<{
    platforms: Array<{
      platform: string;
      url: string;
      verified: boolean;
    }>;
  }> => {
    try {
      const response = await api.put<{
        platforms: Array<{
          platform: string;
          url: string;
          verified: boolean;
        }>;
      }>('/api/brands/profile/social', data);
      return response;
    } catch (error) {
      console.error('Update social presence error:', error);
      throw error;
    }
  },

  /**
   * Get manufacturer reviews for this brand
   * GET /api/brands/profile/reviews
   */
  getManufacturerReviews: async (params?: {
    page?: number;
    limit?: number;
    rating?: number;
  }): Promise<{
    reviews: Array<{
      id: string;
      manufacturerId: string;
      manufacturerName: string;
      rating: number;
      comment: string;
      createdAt: string;
    }>;
    summary: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: Record<number, number>;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.rating) queryParams.set('rating', String(params.rating));

      const response = await api.get<{
        reviews: Array<{
          id: string;
          manufacturerId: string;
          manufacturerName: string;
          rating: number;
          comment: string;
          createdAt: string;
        }>;
        summary: {
          totalReviews: number;
          averageRating: number;
          ratingDistribution: Record<number, number>;
        };
      }>(`/api/brands/profile/reviews?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get manufacturer reviews error:', error);
      throw error;
    }
  },

  /**
   * Submit review for manufacturer
   * POST /api/brands/profile/reviews/:manufacturerId
   */
  submitManufacturerReview: async (manufacturerId: string, data: {
    rating: number;
    comment: string;
    projectId?: string;
  }): Promise<{
    success: boolean;
    reviewId: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        reviewId: string;
      }>(`/api/brands/profile/reviews/${manufacturerId}`, data);
      return response;
    } catch (error) {
      console.error('Submit manufacturer review error:', error);
      throw error;
    }
  },

  // ===== PROFILE ACTIVITY =====
  
  /**
   * Get recent profile activity
   * GET /api/brands/profile/activity
   */
  getProfileActivity: async (params?: {
    days?: number;
    type?: string;
  }): Promise<{
    activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string;
      metadata?: any;
    }>;
    summary: {
      totalActivities: number;
      periodStart: string;
      periodEnd: string;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.days) queryParams.set('days', String(params.days));
      if (params?.type) queryParams.set('type', params.type);

      const response = await api.get<{
        activities: Array<{
          id: string;
          type: string;
          description: string;
          timestamp: string;
          metadata?: any;
        }>;
        summary: {
          totalActivities: number;
          periodStart: string;
          periodEnd: string;
        };
      }>(`/api/brands/profile/activity?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get profile activity error:', error);
      throw error;
    }
  },

  /**
   * Export brand profile data
   * POST /api/brands/profile/export
   */
  exportProfile: async (format: 'json' | 'pdf' | 'csv' = 'json'): Promise<{
    downloadUrl: string;
    expiresAt: string;
    format: string;
  }> => {
    try {
      const response = await api.post<{
        downloadUrl: string;
        expiresAt: string;
        format: string;
      }>('/api/brands/profile/export', { format });
      return response;
    } catch (error) {
      console.error('Export profile error:', error);
      throw error;
    }
  },

  // ===== BADGES AND ACHIEVEMENTS =====
  
  /**
   * Get profile badges and achievements
   * GET /api/brands/profile/badges
   */
  getProfileBadges: async (): Promise<{
    badges: Array<{
      id: string;
      name: string;
      description: string;
      iconUrl: string;
      earnedAt: string;
      category: string;
    }>;
    availableBadges: Array<{
      id: string;
      name: string;
      description: string;
      requirements: string[];
      progress: number;
    }>;
  }> => {
    try {
      const response = await api.get<{
        badges: Array<{
          id: string;
          name: string;
          description: string;
          iconUrl: string;
          earnedAt: string;
          category: string;
        }>;
        availableBadges: Array<{
          id: string;
          name: string;
          description: string;
          requirements: string[];
          progress: number;
        }>;
      }>('/api/brands/profile/badges');
      return response;
    } catch (error) {
      console.error('Get profile badges error:', error);
      throw error;
    }
  },

  // ===== ENTERPRISE FEATURES =====
  
  /**
   * Clone profile template (enterprise only)
   * POST /api/brands/profile/clone-template
   */
  cloneProfileTemplate: async (data: {
    templateId?: string;
    sourceBrandId?: string;
    fieldsToClone: string[];
  }): Promise<{
    success: boolean;
    clonedFields: string[];
    skippedFields: string[];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        clonedFields: string[];
        skippedFields: string[];
      }>('/api/brands/profile/clone-template', data);
      return response;
    } catch (error) {
      console.error('Clone profile template error:', error);
      throw error;
    }
  },
};

// ===== REACT QUERY HOOKS =====

/**
 * Hook for fetching brand by host with optimized caching
 */
export const useBrandByHost = (host: string): UseQueryResult<BrandSettings | null, ApiError> => {
  return useQuery<BrandSettings | null, ApiError>({
    queryKey: ['brandByHost', host],
    queryFn: async () => {
      // Clean host: remove port for local dev and normalize
      const cleanHost = host.replace(/:\d+$/, "").toLowerCase();
      const isLocalhost = cleanHost === "localhost" || cleanHost.endsWith(".localhost");

      if (isLocalhost) {
        // For local dev, return null to use generic branding
        return null;
      }

      try {
        // First, try custom domain endpoint
        const domainResponse = await brandsApi.getBrandByDomain(cleanHost);
        if (domainResponse.success && domainResponse.profile) {
          return domainResponse.profile;
        }
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.statusCode !== 404) {
          console.error(`Error fetching brand by domain ${cleanHost}:`, apiError);
          throw apiError; // Rethrow non-404 errors for query error state
        }
        // On 404, fall through to subdomain
      }

      // Extract subdomain if applicable
      const labels = cleanHost.split(".");
      const subdomain = labels[0];

      if (subdomain && labels.length > 1) {
        try {
          // Try subdomain endpoint
          const subdomainResponse = await brandsApi.getBrandBySubdomain(subdomain);
          if (subdomainResponse.success && subdomainResponse.profile) {
            return subdomainResponse.profile;
          }
        } catch (error) {
          const apiError = error as ApiError;
          if (apiError.statusCode !== 404) {
            console.error(`Error fetching brand by subdomain ${subdomain}:`, apiError);
            throw apiError;
          }
          // On 404, return null
        }
      }

      // If neither succeeds, return null for generic branding
      return null;
    },
    // Cache settings: Stale after 5 minutes, cache for 30 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount: number, error: ApiError) => {
      // Retry on non-404/400 errors, up to 3 times
      return (error.statusCode >= 500) && failureCount < 3;
    },
    enabled: !!host, // Only run if host is provided
  });
};

/**
 * Hook for brand profile with analytics
 */
export const useBrandProfile = (brandId: string, includeAnalytics = false) => {
  return useQuery({
    queryKey: ['brandProfile', brandId, includeAnalytics],
    queryFn: () => brandsApi.getBrandProfile(brandId),
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for public brand profile (for manufacturers)
 */
export const usePublicBrandProfile = (brandId: string) => {
  return useQuery({
    queryKey: ['publicBrandProfile', brandId],
    queryFn: () => brandsApi.getPublicBrandProfile(brandId),
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

/**
 * Hook for brand search with debounced queries
 */
export const useBrandSearch = (query: string, filters?: any) => {
  return useQuery({
    queryKey: ['brandSearch', query, filters],
    queryFn: () => brandsApi.searchBrands(query, filters),
    enabled: query.length >= 3, // Only search with 3+ characters
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for profile completeness
 */
export const useProfileCompleteness = () => {
  return useQuery({
    queryKey: ['profileCompleteness'],
    queryFn: () => brandsApi.getProfileCompleteness(),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ===== HELPER FUNCTIONS =====

/**
 * Check if host should use brand-specific styling
 */
export const shouldUseBrandStyling = (host: string): boolean => {
  const cleanHost = host.replace(/:\d+$/, "").toLowerCase();
  return !cleanHost.includes("localhost") && cleanHost.split(".").length > 1;
};

/**
 * Extract subdomain from host
 */
export const extractSubdomain = (host: string): string | null => {
  const cleanHost = host.replace(/:\d+$/, "").toLowerCase();
  const labels = cleanHost.split(".");
  return labels.length > 2 ? labels[0] : null;
};

/**
 * Generate brand profile URL
 */
export const generateBrandProfileUrl = (brand: BrandSettings): string => {
  if (brand.customDomain) {
    return `https://${brand.customDomain}`;
  }
  if (brand.subdomain) {
    return `https://${brand.subdomain}.yourplatform.com`;
  }
  return `https://yourplatform.com/brands/${brand._id}`;
};
