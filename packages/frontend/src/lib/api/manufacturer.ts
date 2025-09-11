// src/lib/api/manufacturer.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

export interface Manufacturer {
  _id: string;
  name: string; // Manufacturer name (like businessName)
  email: string;
  password: string; // Hashed, not returned
  walletAddress?: string;
  connectedBrands: string[]; // Array of Types.ObjectId as string (brands connected for data sharing)
  isVerified: boolean; // Email/phone verified
  createdAt: Date;
  updatedAt: Date;
  // Additional: industry, contactEmail, etc., if in model
}

export interface ManufacturerProfile {
  description?: string;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  profilePictureUrl?: string;
  website?: string;
  phoneNumber?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
}

export interface ManufacturerAccount {
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: Date;
  lastPasswordChangeAt?: Date;
  // Billing reference if separate, but billing.model.ts is per business
}

// For connections (response for getConnectedBrands)
export interface BrandConnection {
  brandId: string;
  brandName: string;
  connectedAt: Date;
  sharedData: string[]; // e.g., ['voting', 'products', 'analytics']
  accessLevel: 'view' | 'full'; // Assumed for shared access
}

// For shared analytics (from analytics.service.ts, voting.service.ts via manufacturer access)
export interface SharedAnalytics {
  votes: {
    totalVotes: number;
    byProduct: Array<{ productId: string; count: number }>;
  };
  products: {
    totalProducts: number;
    proposals: Array<{ productId: string; title: string; status: string }>;
  };
  // Extend as needed
}

// Dashboard response interface
export interface DashboardSummary {
  success: boolean;
  message: string;
  data: {
    stats: any;
    recentActivity: any[];
    notifications: any[];
    insights: any[];
    quickActions: any[];
    lastUpdated: string;
  };
}

// Token refresh response
export interface TokenRefreshResponse {
  success: boolean;
  data: {
    token: string;
    expiresAt: string;
  };
}

// Search results interface
export interface ManufacturerSearchResults {
  success: boolean;
  data: {
    manufacturers: Manufacturer[];
    query: string;
    filters: {
      industry?: string;
      verified?: boolean;
      minMoq?: number;
      maxMoq?: number;
      services?: string[];
    };
    pagination: {
      total: number;
      limit: number;
      sortBy: string;
    };
    suggestions: string[];
  };
}

/**
 * Searches for manufacturers (public endpoint).
 * @param query - Search query
 * @param filters - Search filters
 * @returns Promise<ManufacturerSearchResults>
 */
export const searchManufacturers = async (
  query: string,
  filters?: {
    industry?: string;
    verified?: boolean;
    minMoq?: number;
    maxMoq?: number;
    services?: string[];
    limit?: number;
    sortBy?: 'relevance' | 'name' | 'completeness' | 'connections';
  }
): Promise<ManufacturerSearchResults> => {
  try {
    const response = await apiClient.get<ManufacturerSearchResults>('/api/manufacturer/search', {
      params: {
        q: query,
        ...filters,
      },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to search manufacturers', 500);
  }
};

/**
 * Fetches the manufacturer profile.
 * @returns Promise<ManufacturerProfile>
 */
export const getManufacturerProfile = async (): Promise<ManufacturerProfile> => {
  try {
    const response = await apiClient.get<{success: boolean; data: ManufacturerProfile}>('/api/manufacturer/profile');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch manufacturer profile', 500);
  }
};

/**
 * Updates the manufacturer profile.
 * @param data - Profile update data
 * @returns Promise<ManufacturerProfile>
 */
export const updateManufacturerProfile = async (data: Partial<ManufacturerProfile>): Promise<ManufacturerProfile> => {
  try {
    const response = await apiClient.put<{success: boolean; data: ManufacturerProfile}>('/api/manufacturer/profile', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update manufacturer profile', 500);
  }
};

/**
 * Gets manufacturer dashboard summary.
 * @returns Promise<DashboardSummary>
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  try {
    const response = await apiClient.get<DashboardSummary>('/api/manufacturer/dashboard');
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch dashboard summary', 500);
  }
};

/**
 * Refreshes manufacturer authentication token.
 * @returns Promise<TokenRefreshResponse>
 */
export const refreshToken = async (): Promise<TokenRefreshResponse> => {
  try {
    const response = await apiClient.post<TokenRefreshResponse>('/api/manufacturer/refresh');
    return response;
  } catch (error) {
    throw new ApiError('Failed to refresh token', 500);
  }
};

/**
 * Logs out manufacturer.
 * @returns Promise<{ success: boolean }>
 */
export const logout = async (): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.post<{ success: boolean }>('/api/manufacturer/logout');
    return response;
  } catch (error) {
    throw new ApiError('Failed to logout', 500);
  }
};

/**
 * Fetches connected brands for the manufacturer.
 * @param params - Optional query parameters
 * @returns Promise<BrandConnection[]>
 */
export const getConnectedBrands = async (params?: {
  status?: string;
  sortBy?: string;
  limit?: number;
}): Promise<BrandConnection[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {brands: BrandConnection[]}}>('/api/manufacturer/brands', {
      params,
    });
    return response.data.brands;
  } catch (error) {
    throw new ApiError('Failed to fetch connected brands', 500);
  }
};

/**
 * Gets connection status with a specific brand.
 * @param brandId - Brand ID
 * @returns Promise<any>
 */
export const getConnectionStatus = async (brandId: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/manufacturer/brands/${brandId}/connection-status`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to get connection status', 500);
  }
};

/**
 * Connects to a brand (post-invitation accept, or direct if allowed).
 * @param brandId - Brand ID
 * @param data - Connection data
 * @returns Promise<any>
 */
export const connectToBrand = async (brandId: string, data?: {
  sharedData?: string[];
  accessLevel?: 'view' | 'full';
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>(`/api/manufacturer/brands/${brandId}/connect`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to connect to brand', 500);
  }
};

/**
 * Disconnects from a brand.
 * @param brandId - Brand ID
 * @returns Promise<{ success: boolean }>
 */
export const disconnectFromBrand = async (brandId: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{ success: boolean }>(`/api/manufacturer/brands/${brandId}/disconnect`);
    return response;
  } catch (error) {
    throw new ApiError('Failed to disconnect from brand', 500);
  }
};

/**
 * Fetches shared analytics from a connected brand.
 * Uses analytics.service.ts/manufacturer.service.ts to authorize and fetch
 * @param brandId - Brand ID
 * @returns Promise<SharedAnalytics>
 */
export const getSharedAnalytics = async (brandId: string): Promise<SharedAnalytics> => {
  try {
    const response = await apiClient.get<{success: boolean; data: SharedAnalytics}>(`/api/manufacturer/brands/${brandId}/analytics`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch shared analytics', 500);
  }
};

/**
 * Fetches shared product proposals from a connected brand.
 * @param brandId - Brand ID
 * @returns Promise<Array<{ productId: string; title: string; description: string; votes: number; status: string }>>
 */
export const getSharedProducts = async (brandId: string): Promise<Array<{ productId: string; title: string; description: string; votes: number; status: string }>> => {
  try {
    const response = await apiClient.get<{success: boolean; data: Array<{ productId: string; title: string; description: string; votes: number; status: string }>}>(`/api/manufacturer/brands/${brandId}/products`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch shared products', 500);
  }
};

// Legacy functions for backward compatibility
export const getManufacturer = getManufacturerProfile;
export const updateManufacturer = updateManufacturerProfile;
export const getManufacturerAccount = getDashboardSummary; // Dashboard includes account info