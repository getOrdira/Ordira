// src/lib/api/manufacturerDiscovery.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

// Type definitions aligned with backend manufacturerProfile.controller.ts and manufacturerProfile.service.ts
// Routes from /api/manufacturer-profiles/* (for brand discovery of manufacturers)
// Controller: manufacturerProfile.controller.ts handles listManufacturerProfiles, getManufacturerProfile, advancedManufacturerSearch
// Service: manufacturerProfile.service.ts for manufacturer discovery and search functionality
// Note: This is different from /api/manufacturer/profile which is for manufacturer's own profile management

export interface ManufacturerSearchResult {
  id: string;
  name: string;
  industry?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  isVerified?: boolean;
  profileCompleteness?: number;
  profileScore?: number;
  matchScore?: number;
  headquarters?: {
    country?: string;
    city?: string;
  };
  establishedYear?: number;
  certifications?: string[];
  averageResponseTime?: number;
  connectionSuccessRate?: number;
}

export interface ManufacturerProfileDetail {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  profilePictureUrl?: string;
  contactEmail?: string;
  socialUrls?: string[];
  website?: string;
  connectedBrandsCount?: number;
  isVerified?: boolean;
  profileCompleteness?: number;
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  certifications?: string[];
  averageResponseTime?: number;
  clientSatisfactionRating?: number;
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: string;
  };
  lastActive?: Date;
  profileScore?: number;
}

export interface SearchFilters {
  query?: string;
  industry?: string;
  services?: string[];
  minMoq?: number;
  maxMoq?: number;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'industry' | 'moq' | 'profileCompleteness' | 'profileScore' | 'connections' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface AdvancedSearchCriteria {
  query?: string;
  industries?: string[];
  services?: string[];
  moqRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    country?: string;
    city?: string;
    radius?: number;
  };
  certifications?: string[];
  rating?: {
    min?: number;
  };
  verified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  saveSearch?: boolean;
  searchName?: string;
}

export interface ManufacturerListResponse {
  success: boolean;
  message: string;
  data: {
    manufacturers: ManufacturerSearchResult[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      query?: string;
      industry?: string;
      services?: string[];
      moqRange?: {
        min?: number;
        max?: number;
      };
    };
    aggregations?: {
      industries: Array<{ name: string; count: number }>;
      services: Array<{ name: string; count: number }>;
      locations: Array<{ name: string; count: number }>;
      moqRanges: Array<{ range: string; count: number }>;
    };
  };
}

export interface ManufacturerDetailResponse {
  success: boolean;
  data: {
    manufacturer: ManufacturerProfileDetail;
    connectionStatus?: {
      status: 'none' | 'pending' | 'connected' | 'rejected';
      canConnect: boolean;
      lastInteraction?: Date;
    };
    analytics?: {
      profileViews: number;
      connectionRequests: number;
      successfulConnections: number;
      averageResponseTime: number;
    };
    relatedManufacturers?: ManufacturerSearchResult[];
  };
}

export interface FeaturedManufacturersResponse {
  success: boolean;
  data: {
    featured: ManufacturerSearchResult[];
    trending: ManufacturerSearchResult[];
    recommended: ManufacturerSearchResult[];
    criteria: {
      featuredCriteria: string[];
      trendingCriteria: string[];
      recommendationBasis: string[];
    };
  };
}

export interface AdvancedSearchResponse {
  success: boolean;
  data: {
    manufacturers: ManufacturerSearchResult[];
    searchId?: string;
    savedAs?: string;
    executionTime: number;
    totalResults: number;
    appliedFilters: AdvancedSearchCriteria;
    suggestions?: string[];
    relatedSearches?: string[];
  };
}

/**
 * Lists all public manufacturer profiles for brand discovery.
 * Endpoint: GET /api/manufacturer-profiles
 * Response: ManufacturerListResponse with pagination and filters
 * Controller: manufacturerProfile.controller.listManufacturerProfiles
 * @param filters - Search and filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const listManufacturers = async (filters?: SearchFilters): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles', {
      params: filters,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to list manufacturers', error);
  }
};

/**
 * Searches manufacturers with basic filtering.
 * Endpoint: GET /api/manufacturer-profiles/search
 * Response: ManufacturerListResponse with search results
 * Controller: manufacturerProfile.controller.listManufacturerProfiles (with search params)
 * @param filters - Search parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const searchManufacturers = async (filters: SearchFilters): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles/search', {
      params: filters,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to search manufacturers', error);
  }
};

/**
 * Advanced manufacturer search with complex criteria.
 * Endpoint: POST /api/manufacturer-profiles/search
 * Request body: AdvancedSearchCriteria with complex filtering options
 * Response: AdvancedSearchResponse with detailed results
 * Controller: manufacturerProfile.controller.advancedManufacturerSearch
 * @param criteria - Advanced search criteria
 * @returns Promise<AdvancedSearchResponse>
 */
export const advancedSearchManufacturers = async (criteria: AdvancedSearchCriteria): Promise<AdvancedSearchResponse> => {
  try {
    const response = await apiClient.post<AdvancedSearchResponse>('/api/manufacturer-profiles/search', criteria);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to perform advanced search', error);
  }
};

/**
 * Gets detailed manufacturer profile by ID for brand viewing.
 * Endpoint: GET /api/manufacturer-profiles/:id
 * Response: ManufacturerDetailResponse with comprehensive profile data
 * Controller: manufacturerProfile.controller.getManufacturerProfile
 * @param id - Manufacturer ID
 * @returns Promise<ManufacturerDetailResponse>
 */
export const getManufacturerDetail = async (id: string): Promise<ManufacturerDetailResponse> => {
  try {
    const response = await apiClient.get<ManufacturerDetailResponse>(`/api/manufacturer-profiles/${id}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get manufacturer details', error);
  }
};

/**
 * Gets featured and recommended manufacturers.
 * Endpoint: GET /api/manufacturer-profiles/featured
 * Response: FeaturedManufacturersResponse with curated manufacturer lists
 * Controller: manufacturerProfile.controller (featured method)
 * @param params - Optional parameters for featured selection
 * @returns Promise<FeaturedManufacturersResponse>
 */
export const getFeaturedManufacturers = async (params?: {
  limit?: number;
  industry?: string;
  includeRecommended?: boolean;
}): Promise<FeaturedManufacturersResponse> => {
  try {
    const response = await apiClient.get<FeaturedManufacturersResponse>('/api/manufacturer-profiles/featured', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get featured manufacturers', error);
  }
};

/**
 * Gets manufacturers by specific industry.
 * Endpoint: GET /api/manufacturer-profiles/industry/:industry
 * Response: ManufacturerListResponse filtered by industry
 * Controller: manufacturerProfile.controller (industry-specific method)
 * @param industry - Industry name
 * @param params - Additional filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getManufacturersByIndustry = async (
  industry: string, 
  params?: Omit<SearchFilters, 'industry'>
): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>(`/api/manufacturer-profiles/industry/${industry}`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get manufacturers by industry', error);
  }
};

/**
 * Gets manufacturers by location/region.
 * Endpoint: GET /api/manufacturer-profiles/location/:country
 * Response: ManufacturerListResponse filtered by location
 * Controller: manufacturerProfile.controller (location-specific method)
 * @param country - Country code
 * @param params - Additional filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getManufacturersByLocation = async (
  country: string,
  params?: {
    city?: string;
    radius?: number;
    limit?: number;
    sortBy?: string;
  }
): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>(`/api/manufacturer-profiles/location/${country}`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get manufacturers by location', error);
  }
};

/**
 * Gets manufacturers with specific certifications.
 * Endpoint: GET /api/manufacturer-profiles/certified
 * Response: ManufacturerListResponse with verified/certified manufacturers
 * Controller: manufacturerProfile.controller (certification filter method)
 * @param params - Certification filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getCertifiedManufacturers = async (params?: {
  certifications?: string[];
  verifiedOnly?: boolean;
  limit?: number;
  sortBy?: string;
}): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles/certified', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get certified manufacturers', error);
  }
};

/**
 * Gets trending manufacturers based on recent activity.
 * Endpoint: GET /api/manufacturer-profiles/trending
 * Response: ManufacturerListResponse with trending manufacturers
 * Controller: manufacturerProfile.controller (trending method)
 * @param params - Trending selection parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getTrendingManufacturers = async (params?: {
  timeframe?: '24h' | '7d' | '30d';
  limit?: number;
  industry?: string;
}): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles/trending', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get trending manufacturers', error);
  }
};

/**
 * Gets manufacturers with high ratings/reviews.
 * Endpoint: GET /api/manufacturer-profiles/top-rated
 * Response: ManufacturerListResponse with highly-rated manufacturers
 * Controller: manufacturerProfile.controller (rating-based method)
 * @param params - Rating filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getTopRatedManufacturers = async (params?: {
  minRating?: number;
  minReviews?: number;
  industry?: string;
  limit?: number;
}): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles/top-rated', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get top-rated manufacturers', error);
  }
};

/**
 * Gets manufacturers matching specific MOQ requirements.
 * Endpoint: GET /api/manufacturer-profiles/moq
 * Response: ManufacturerListResponse filtered by MOQ range
 * Controller: manufacturerProfile.controller (MOQ filter method)
 * @param moqRange - MOQ range parameters
 * @param params - Additional filter parameters
 * @returns Promise<ManufacturerListResponse>
 */
export const getManufacturersByMOQ = async (
  moqRange: { min?: number; max?: number },
  params?: Omit<SearchFilters, 'minMoq' | 'maxMoq'>
): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>('/api/manufacturer-profiles/moq', {
      params: {
        ...moqRange,
        ...params,
      },
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get manufacturers by MOQ', error);
  }
};

/**
 * Gets manufacturer search suggestions and filters.
 * Endpoint: GET /api/manufacturer-profiles/filters
 * Response: Available filter options and search suggestions
 * Controller: manufacturerProfile.controller (filters/suggestions method)
 * @returns Promise<any>
 */
export const getSearchFilters = async (): Promise<{
  industries: string[];
  services: string[];
  locations: Array<{ country: string; cities: string[] }>;
  certifications: string[];
  moqRanges: Array<{ label: string; min?: number; max?: number }>;
  sortOptions: Array<{ value: string; label: string }>;
}> => {
  try {
    const response = await apiClient.get<{
      industries: string[];
      services: string[];
      locations: Array<{ country: string; cities: string[] }>;
      certifications: string[];
      moqRanges: Array<{ label: string; min?: number; max?: number }>;
      sortOptions: Array<{ value: string; label: string }>;
    }>('/api/manufacturer-profiles/filters');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get search filters', error);
  }
};

/**
 * Saves search criteria for future use.
 * Endpoint: POST /api/manufacturer-profiles/save-search
 * Request body: Search criteria with save parameters
 * Response: Saved search confirmation
 * Controller: manufacturerProfile.controller (save search method)
 * @param searchData - Search criteria to save
 * @returns Promise<{ success: boolean; searchId: string; name: string }>
 */
export const saveSearch = async (searchData: {
  name: string;
  criteria: AdvancedSearchCriteria;
  notifications?: boolean;
}): Promise<{ success: boolean; searchId: string; name: string }> => {
  try {
    const response = await apiClient.post<{ success: boolean; searchId: string; name: string }>('/api/manufacturer-profiles/save-search', searchData);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to save search', error);
  }
};

/**
 * Gets saved searches for the current brand.
 * Endpoint: GET /api/manufacturer-profiles/saved-searches
 * Response: List of saved searches
 * Controller: manufacturerProfile.controller (saved searches method)
 * @returns Promise<Array<{ id: string; name: string; criteria: any; createdAt: Date; lastUsed?: Date }>>
 */
export const getSavedSearches = async (): Promise<Array<{
  id: string;
  name: string;
  criteria: AdvancedSearchCriteria;
  createdAt: Date;
  lastUsed?: Date;
  resultCount?: number;
}>> => {
  try {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      criteria: AdvancedSearchCriteria;
      createdAt: Date;
      lastUsed?: Date;
      resultCount?: number;
    }>>('/api/manufacturer-profiles/saved-searches');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get saved searches', error);
  }
};

/**
 * Runs a saved search by ID.
 * Endpoint: GET /api/manufacturer-profiles/saved-searches/:id/run
 * Response: Search results from saved criteria
 * Controller: manufacturerProfile.controller (run saved search method)
 * @param searchId - Saved search ID
 * @returns Promise<ManufacturerListResponse>
 */
export const runSavedSearch = async (searchId: string): Promise<ManufacturerListResponse> => {
  try {
    const response = await apiClient.get<ManufacturerListResponse>(`/api/manufacturer-profiles/saved-searches/${searchId}/run`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to run saved search', error);
  }
};

// Legacy function aliases for backward compatibility
export const discoverManufacturers = listManufacturers;
export const findManufacturers = searchManufacturers;
export const getManufacturerProfile = getManufacturerDetail;