import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ApiError } from '@/lib/errors';
import apiClient from '@/lib/api/client';

// ===== TYPES =====

type ConnectionStatus = 'none' | 'pending' | 'connected' | 'rejected' | 'expired';
type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

interface ManufacturerProfile {
  id: string;
  name: string;
  email: string;
  industry: string;
  description?: string;
  contactEmail?: string;
  website?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  servicesOffered: string[];
  specializations: string[];
  moq?: number; // Minimum Order Quantity
  leadTime?: string;
  certifications: Array<{
    id: string;
    name: string;
    issuedBy: string;
    validUntil?: string;
    documentUrl?: string;
  }>;
  portfolio: Array<{
    id: string;
    title: string;
    description: string;
    images: string[];
    category: string;
    tags: string[];
  }>;
  awards: Array<{
    id: string;
    title: string;
    awardedBy: string;
    year: number;
    description?: string;
  }>;
  profileCompleteness: number;
  isVerified: VerificationStatus;
  verificationBadges: string[];
  totalConnections: number;
  activeConnections: number;
  rating?: number;
  reviewCount: number;
  joinDate: string;
  lastActive: string;
  businessHours?: {
    timezone: string;
    schedule: Record<string, { open: string; close: string; isOpen: boolean }>;
  };
}

interface ConnectedBrand {
  id: string;
  businessId: string;
  businessName: string;
  logoUrl?: string;
  industry: string;
  connectionDate: string;
  connectionStatus: ConnectionStatus;
  verified: boolean;
  lastActivity?: string;
  orderStats?: {
    totalOrders: number;
    totalValue: number;
    avgOrderValue: number;
    lastOrder?: string;
  };
  collaborationStats?: {
    activeProjects: number;
    completedProjects: number;
    satisfaction: number;
  };
}

interface ConnectionRequest {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  status: ConnectionStatus;
  message?: string;
  services?: string[];
  proposedServices?: string[];
  timeline?: string;
  budget?: string;
  portfolio?: string;
  createdAt: string;
  expiresAt?: string;
  responseAt?: string;
  responseMessage?: string;
}

interface DashboardSummary {
  profile: ManufacturerProfile;
  connectionStats: {
    total: number;
    pending: number;
    active: number;
    thisMonth: number;
    growthRate: number;
  };
  businessMetrics: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    fulfillmentRate: number;
    customerSatisfaction: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'connection' | 'order' | 'certificate' | 'message' | 'review';
    title: string;
    description: string;
    timestamp: string;
    metadata?: any;
  }>;
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    actionRequired?: boolean;
    actionUrl?: string;
    createdAt: string;
  }>;
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }>;
}

interface ManufacturerAnalytics {
  summary: {
    totalConnections: number;
    activeConnections: number;
    totalOrders: number;
    totalRevenue: number;
    certificatesIssued: number;
    averageRating: number;
  };
  brandMetrics: {
    totalConnected: number;
    activeCollaborations: number;
    newConnectionsInPeriod: number;
    connectionGrowthRate: number;
  };
  collaborationMetrics: {
    active: number;
    pending: number;
    completed: number;
    successRate: number;
    avgProjectDuration: number;
  };
  productDemand?: {
    opportunities: Array<{
      brandId: string;
      brandName: string;
      productCategory: string;
      estimatedVolume: number;
      priority: 'low' | 'medium' | 'high';
    }>;
    trends: Record<string, any>;
  };
  marketData?: {
    trends: Record<string, any>;
    insights: Array<{
      category: string;
      insight: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
  businessInsights: {
    connectedBrands: number;
    activeCollaborations: number;
    productionOpportunities: Array<any>;
    marketTrends: Record<string, any>;
  };
  recommendations: Array<{
    category: 'growth' | 'optimization' | 'quality' | 'marketing';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
    actionItems: string[];
  }>;
}

interface BrandSearchQuery {
  search?: string;
  industry?: string;
  location?: string;
  minOrderValue?: number;
  maxOrderValue?: number;
  certifications?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'rating' | 'orders' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

interface BrandSearchResult {
  brands: Array<{
    id: string;
    name: string;
    industry: string;
    location?: string;
    rating: number;
    reviewCount: number;
    logoUrl?: string;
    description: string;
    orderVolume: number;
    avgOrderValue: number;
    connectionStatus: ConnectionStatus;
    canConnect: boolean;
    badges: string[];
    lastActive: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    industries: Array<{ value: string; count: number }>;
    locations: Array<{ value: string; count: number }>;
    certifications: Array<{ value: string; count: number }>;
  };
}

interface CreateConnectionRequest {
  brandId: string;
  message?: string;
  services?: string[];
  proposedServices?: string[];
  timeline?: string;
  budget?: string;
  portfolio?: string;
}

interface UpdateProfileRequest {
  name?: string;
  industry?: string;
  description?: string;
  contactEmail?: string;
  website?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  servicesOffered?: string[];
  specializations?: string[];
  moq?: number;
  leadTime?: string;
  businessHours?: {
    timezone: string;
    schedule: Record<string, { open: string; close: string; isOpen: boolean }>;
  };
}

// ===== API FUNCTIONS =====

// Use the centralized API client
const api = apiClient;

const manufacturerApi = {
  // Profile management
  getProfile: async (): Promise<ManufacturerProfile> => {
    const response = await api.get('/manufacturer/profile');
    return response.data.data.profile;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ManufacturerProfile> => {
    const response = await api.put('/manufacturer/profile', data);
    return response.data.data.profile;
  },

  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await api.get('/manufacturer/dashboard');
    return response.data.data;
  },

  // Brand connections
  getConnectedBrands: async (params?: { page?: number; limit?: number; status?: string }): Promise<{
    brands: ConnectedBrand[];
    pagination: any;
    connectionStats: any;
  }> => {
    const response = await api.get('/manufacturer/brands', { params });
    return response.data.data;
  },

  searchBrands: async (params?: BrandSearchQuery): Promise<BrandSearchResult> => {
    const response = await api.get('/manufacturer/search', { params });
    return response.data.data;
  },

  getConnectionStatus: async (brandId: string): Promise<{
    status: ConnectionStatus;
    hasActiveRequest: boolean;
    requestId?: string;
    connectedAt?: string;
    expiresAt?: string;
  }> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/connection-status`);
    return response.data.data;
  },

  canConnectToBrand: async (brandId: string): Promise<{
    canConnect: boolean;
    reasons?: string[];
    requirements?: string[];
  }> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/can-connect`);
    return response.data.data;
  },

  createConnectionRequest: async (data: CreateConnectionRequest): Promise<ConnectionRequest> => {
    const response = await api.post(`/manufacturer/brands/${data.brandId}/connect`, data);
    return response.data.data;
  },

  getConnectionRequests: async (params?: { status?: string; page?: number; limit?: number }): Promise<{
    requests: ConnectionRequest[];
    pagination: any;
  }> => {
    const response = await api.get('/manufacturer/connection-requests', { params });
    return response.data.data;
  },

  respondToConnectionRequest: async (requestId: string, response: 'accept' | 'reject', message?: string): Promise<{
    success: boolean;
    connection?: ConnectedBrand;
  }> => {
    const apiResponse = await api.put(`/manufacturer/connection-requests/${requestId}/respond`, { response, message });
    return apiResponse.data;
  },

  disconnectFromBrand: async (brandId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/manufacturer/brands/${brandId}/disconnect`, { data: { reason } });
    return response.data;
  },

  // Brand-specific data
  getBrandAnalytics: async (brandId: string, params?: { timeframe?: string; metrics?: string[] }): Promise<any> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/analytics`, { params });
    return response.data.data;
  },

  getBrandResults: async (brandSettingsId: string, params?: { timeframe?: string }): Promise<any> => {
    const response = await api.get(`/manufacturer/brands/${brandSettingsId}/results`, { params });
    return response.data.data;
  },

  getBrandOrders: async (brandId: string, params?: { page?: number; limit?: number; status?: string }): Promise<{
    orders: any[];
    pagination: any;
  }> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/orders`, { params });
    return response.data.data;
  },

  getBrandProducts: async (brandId: string, params?: { page?: number; limit?: number; category?: string }): Promise<{
    products: any[];
    pagination: any;
  }> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/products`, { params });
    return response.data.data;
  },

  getBrandCertificates: async (brandId: string, params?: { page?: number; limit?: number; status?: string }): Promise<{
    certificates: any[];
    pagination: any;
  }> => {
    const response = await api.get(`/manufacturer/brands/${brandId}/certificates`, { params });
    return response.data.data;
  },

  // Analytics
  getManufacturerAnalytics: async (params?: {
    timeframe?: string;
    brandId?: string;
    metrics?: string[];
    includeProductDemand?: boolean;
    includeMarketInsights?: boolean;
  }): Promise<ManufacturerAnalytics> => {
    const response = await api.get('/analytics/manufacturer', { params });
    return response.data.data;
  },

  // Authentication
  refreshToken: async (): Promise<{ token: string; manufacturer: ManufacturerProfile }> => {
    const response = await api.post('/manufacturer/refresh');
    return response.data.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/manufacturer/logout');
    return response.data;
  },

  // Portfolio management
  addPortfolioItem: async (data: {
    title: string;
    description: string;
    category: string;
    images?: string[];
    tags?: string[];
  }): Promise<{ success: boolean; item: any }> => {
    const response = await api.post('/manufacturer/profile/portfolio', data);
    return response.data;
  },

  updatePortfolioItem: async (itemId: string, data: any): Promise<{ success: boolean; item: any }> => {
    const response = await api.put(`/manufacturer/profile/portfolio/${itemId}`, data);
    return response.data;
  },

  removePortfolioItem: async (itemId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/manufacturer/profile/portfolio/${itemId}`);
    return response.data;
  },

  // Certifications
  addCertification: async (data: {
    name: string;
    issuedBy: string;
    validUntil?: string;
    documentUrl?: string;
  }): Promise<{ success: boolean; certification: any }> => {
    const response = await api.post('/manufacturer/profile/certifications', data);
    return response.data;
  },

  updateCertification: async (certId: string, data: any): Promise<{ success: boolean; certification: any }> => {
    const response = await api.put(`/manufacturer/profile/certifications/${certId}`, data);
    return response.data;
  },

  removeCertification: async (certId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/manufacturer/profile/certifications/${certId}`);
    return response.data;
  },

  // Business verification
  submitVerificationRequest: async (data: {
    businessDocuments: string[];
    certifications: string[];
    references: Array<{
      companyName: string;
      contactName: string;
      email: string;
      relationship: string;
    }>;
  }): Promise<{ success: boolean; verificationId: string }> => {
    const response = await api.post('/manufacturer/profile/verification/submit', data);
    return response.data;
  },

  getVerificationStatus: async (): Promise<{
    status: VerificationStatus;
    submittedAt?: string;
    reviewedAt?: string;
    feedback?: string;
    requirements?: string[];
  }> => {
    const response = await api.get('/manufacturer/profile/verification/status');
    return response.data.data;
  },
};

// ===== HOOKS =====

/**
 * Get manufacturer profile
 */
export function useManufacturerProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['manufacturer', 'profile'],
    queryFn: manufacturerApi.getProfile,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Update manufacturer profile
 */
export function useUpdateManufacturerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.updateProfile,
    onSuccess: (updatedProfile) => {
      // Update profile cache
      queryClient.setQueryData(['manufacturer', 'profile'], updatedProfile);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'analytics'] });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
    },
  });
}

/**
 * Get manufacturer dashboard
 */
export function useManufacturerDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['manufacturer', 'dashboard'],
    queryFn: manufacturerApi.getDashboard,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get connected brands
 */
export function useConnectedBrands(
  params?: { page?: number; limit?: number; status?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'brands', params],
    queryFn: () => manufacturerApi.getConnectedBrands(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
}

/**
 * Search for brands to connect with
 */
export function useSearchBrands(
  params?: BrandSearchQuery,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'search', 'brands', params],
    queryFn: () => manufacturerApi.searchBrands(params),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true,
  });
}

/**
 * Infinite scroll brand search
 */
export function useInfiniteSearchBrands(
  baseParams?: Omit<BrandSearchQuery, 'page'>,
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery({
    queryKey: ['manufacturer', 'search', 'brands', 'infinite', baseParams],
    queryFn: ({ pageParam = 1 }) => manufacturerApi.searchBrands({ ...baseParams, page: pageParam }),
    enabled: options?.enabled ?? true,
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get connection status with specific brand
 */
export function useConnectionStatus(brandId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['manufacturer', 'connection-status', brandId],
    queryFn: () => manufacturerApi.getConnectionStatus(brandId!),
    enabled: (options?.enabled ?? true) && !!brandId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Check if can connect to brand
 */
export function useCanConnectToBrand(brandId: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['manufacturer', 'can-connect', brandId],
    queryFn: () => manufacturerApi.canConnectToBrand(brandId!),
    enabled: (options?.enabled ?? true) && !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create connection request
 */
export function useCreateConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.createConnectionRequest,
    onSuccess: (_, variables) => {
      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'connection-status', variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'dashboard'] });
    },
    onError: (error) => {
      console.error('Connection request failed:', error);
    },
  });
}

/**
 * Get connection requests
 */
export function useConnectionRequests(
  params?: { status?: string; page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'connection-requests', params],
    queryFn: () => manufacturerApi.getConnectionRequests(params),
    enabled: options?.enabled ?? true,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

/**
 * Respond to connection request
 */
export function useRespondToConnectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, response, message }: { 
      requestId: string; 
      response: 'accept' | 'reject'; 
      message?: string 
    }) => manufacturerApi.respondToConnectionRequest(requestId, response, message),
    onSuccess: () => {
      // Invalidate connection requests and brands
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'brands'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'dashboard'] });
    },
    onError: (error) => {
      console.error('Connection response failed:', error);
    },
  });
}

/**
 * Disconnect from brand
 */
export function useDisconnectFromBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, reason }: { brandId: string; reason?: string }) =>
      manufacturerApi.disconnectFromBrand(brandId, reason),
    onSuccess: (_, variables) => {
      // Invalidate brand-related queries
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'brands'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'connection-status', variables.brandId] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'dashboard'] });
    },
    onError: (error) => {
      console.error('Disconnect failed:', error);
    },
  });
}

/**
 * Get brand analytics
 */
export function useBrandAnalytics(
  brandId: string | null | undefined,
  params?: { timeframe?: string; metrics?: string[] },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'brands', brandId, 'analytics', params],
    queryFn: () => manufacturerApi.getBrandAnalytics(brandId!, params),
    enabled: (options?.enabled ?? true) && !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get brand results/voting data
 */
export function useBrandResults(
  brandSettingsId: string | null | undefined,
  params?: { timeframe?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'brands', brandSettingsId, 'results', params],
    queryFn: () => manufacturerApi.getBrandResults(brandSettingsId!, params),
    enabled: (options?.enabled ?? true) && !!brandSettingsId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get brand orders
 */
export function useBrandOrders(
  brandId: string | null | undefined,
  params?: { page?: number; limit?: number; status?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'brands', brandId, 'orders', params],
    queryFn: () => manufacturerApi.getBrandOrders(brandId!, params),
    enabled: (options?.enabled ?? true) && !!brandId,
    staleTime: 1 * 60 * 1000, // 1 minute
    keepPreviousData: true,
  });
}

/**
 * Get manufacturer analytics
 */
export function useManufacturerAnalytics(
  params?: {
    timeframe?: string;
    brandId?: string;
    metrics?: string[];
    includeProductDemand?: boolean;
    includeMarketInsights?: boolean;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['manufacturer', 'analytics', params],
    queryFn: () => manufacturerApi.getManufacturerAnalytics(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Portfolio management hooks
 */
export function useAddPortfolioItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.addPortfolioItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Add portfolio item failed:', error);
    },
  });
}

export function useUpdatePortfolioItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) =>
      manufacturerApi.updatePortfolioItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Update portfolio item failed:', error);
    },
  });
}

export function useRemovePortfolioItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.removePortfolioItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Remove portfolio item failed:', error);
    },
  });
}

/**
 * Certification management hooks
 */
export function useAddCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.addCertification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Add certification failed:', error);
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ certId, data }: { certId: string; data: any }) =>
      manufacturerApi.updateCertification(certId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Update certification failed:', error);
    },
  });
}

export function useRemoveCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.removeCertification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
    },
    onError: (error) => {
      console.error('Remove certification failed:', error);
    },
  });
}

/**
 * Business verification hooks
 */
export function useSubmitVerificationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.submitVerificationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturer', 'verification'] });
    },
    onError: (error) => {
      console.error('Verification submission failed:', error);
    },
  });
}

export function useVerificationStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['manufacturer', 'verification', 'status'],
    queryFn: manufacturerApi.getVerificationStatus,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Authentication hooks
 */
export function useRefreshManufacturerToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.refreshToken,
    onSuccess: (data) => {
      // Update token in storage
      localStorage.setItem('manufacturerToken', data.token);
      
      // Update profile cache
      queryClient.setQueryData(['manufacturer', 'profile'], data.manufacturer);
    },
    onError: (error) => {
      console.error('Token refresh failed:', error);
      // Handle logout
      localStorage.removeItem('manufacturerToken');
      queryClient.clear();
    },
  });
}

export function useManufacturerLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: manufacturerApi.logout,
    onSuccess: () => {
      // Clear storage and cache
      localStorage.removeItem('manufacturerToken');
      localStorage.removeItem('token');
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });
}

/**
 * Real-time dashboard updates
 */
export function useRealtimeManufacturerDashboard(enabled: boolean = false) {
  return useQuery({
    queryKey: ['manufacturer', 'dashboard', 'realtime'],
    queryFn: manufacturerApi.getDashboard,
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
  });
}

/**
 * Comprehensive manufacturer status
 */
export function useManufacturerStatus() {
  const profile = useManufacturerProfile();
  const dashboard = useManufacturerDashboard();
  const verification = useVerificationStatus();

  return {
    profile: profile.data,
    dashboard: dashboard.data,
    verification: verification.data,
    isLoading: profile.isLoading || dashboard.isLoading,
    error: profile.error || dashboard.error,
    
    // Computed values
    isVerified: profile.data?.isVerified === 'verified',
    profileComplete: (profile.data?.profileCompleteness || 0) >= 90,
    hasActiveConnections: (profile.data?.activeConnections || 0) > 0,
    needsAttention: [
      ...(profile.data?.profileCompleteness < 80 ? ['Complete your profile'] : []),
      ...(profile.data?.isVerified !== 'verified' ? ['Verify your business'] : []),
      ...(dashboard.data?.notifications?.filter(n => n.actionRequired) || []).map(n => n.message),
    ],
    
    // Quick stats
    stats: {
      connections: profile.data?.totalConnections || 0,
      activeConnections: profile.data?.activeConnections || 0,
      completeness: profile.data?.profileCompleteness || 0,
      rating: profile.data?.rating || 0,
      reviewCount: profile.data?.reviewCount || 0,
    },
  };
}