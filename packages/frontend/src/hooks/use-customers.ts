// src/hooks/use-customers.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { AllowedCustomer, CustomerListResponse, CustomerAnalyticsResponse } from '@/lib/types/allowed-customers';
import * as emailGatingApi from '@/lib/api/email-gating';
import { ApiError } from '@/lib/errors';

interface UseCustomersOptions {
  source?: 'manual' | 'shopify' | 'woocommerce' | 'csv_import' | 'api_import';
  hasAccess?: boolean;
  isActive?: boolean;
  vipStatus?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseCustomersReturn {
  // Data
  customers: AllowedCustomer[];
  customer: AllowedCustomer | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Summary
  summary: {
    total: number;
    active: number;
    vip: number;
    totalVotes: number;
  };
  
  // Actions
  addCustomer: UseMutationResult<{ success: boolean; customer: AllowedCustomer; message: string }, ApiError, {
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    vipStatus?: boolean;
    externalCustomerId?: string;
    notes?: string;
  }>;
  updateCustomer: UseMutationResult<{ success: boolean; customer: AllowedCustomer; changes: string[] }, ApiError, { id: string; data: Partial<AllowedCustomer> }>;
  deleteCustomer: UseMutationResult<{ success: boolean; deleted: boolean; customerId: string; deletedAt: string; impact: any; warning: string }, ApiError, string>;
  grantAccess: UseMutationResult<{ success: boolean; customer: AllowedCustomer; granted: any; impact: string }, ApiError, string>;
  revokeAccess: UseMutationResult<{ success: boolean; customer: AllowedCustomer; revocation: any; impact: any }, ApiError, { customerId: string; reason?: string }>;
  restoreAccess: UseMutationResult<{ success: boolean; customer: AllowedCustomer; restoration: any; impact: string }, ApiError, string>;
  
  // Bulk operations
  bulkAddCustomers: UseMutationResult<any, ApiError, Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    vipStatus?: boolean;
    externalCustomerId?: string;
  }>>;
  bulkUpdateAccess: UseMutationResult<any, ApiError, {
    customerIds: string[];
    action: 'grant' | 'revoke';
    reason?: string;
  }>;
  
  // Sync operations
  syncFromShopify: UseMutationResult<any, ApiError, void>;
  syncFromWooCommerce: UseMutationResult<any, ApiError, void>;
  syncFromSource: UseMutationResult<any, ApiError, 'shopify' | 'woocommerce' | 'csv' | 'api'>;
  
  // Refetch functions
  refetch: () => void;
  refetchCustomer: (email: string) => void;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const queryClient = useQueryClient();
  
  const {
    source,
    hasAccess,
    isActive,
    vipStatus,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Fetch customers list
  const {
    data: customersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CustomerListResponse, ApiError>({
    queryKey: ['customers', 'list', { source, hasAccess, isActive, vipStatus, search, page, limit, sortBy, sortOrder }],
    queryFn: () => emailGatingApi.getCustomers({
      source,
      hasAccess,
      isActive,
      vipStatus,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add customer mutation
  const addCustomer = useMutation({
    mutationFn: emailGatingApi.addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Update customer mutation
  const updateCustomer = useMutation({
    mutationFn: ({ id, data }) => emailGatingApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: emailGatingApi.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Grant access mutation
  const grantAccess = useMutation({
    mutationFn: emailGatingApi.grantAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Revoke access mutation
  const revokeAccess = useMutation({
    mutationFn: ({ customerId, reason }) => emailGatingApi.revokeAccess(customerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Restore access mutation
  const restoreAccess = useMutation({
    mutationFn: emailGatingApi.restoreAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Bulk add customers mutation
  const bulkAddCustomers = useMutation({
    mutationFn: emailGatingApi.bulkAddCustomers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Bulk update access mutation
  const bulkUpdateAccess = useMutation({
    mutationFn: emailGatingApi.bulkUpdateAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from Shopify mutation
  const syncFromShopify = useMutation({
    mutationFn: emailGatingApi.syncFromShopify,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from WooCommerce mutation
  const syncFromWooCommerce = useMutation({
    mutationFn: emailGatingApi.syncFromWooCommerce,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from source mutation
  const syncFromSource = useMutation({
    mutationFn: emailGatingApi.syncFromSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Refetch specific customer
  const refetchCustomer = (email: string) => {
    queryClient.invalidateQueries({ queryKey: ['customers', 'detail', email] });
  };

  return {
    customers: customersData?.data?.customers || [],
    customer: null, // Will be set by useCustomer hook
    isLoading,
    isError,
    error,
    pagination: {
      page: customersData?.data?.pagination?.page || 1,
      limit: customersData?.data?.pagination?.limit || 20,
      total: customersData?.data?.pagination?.total || 0,
      totalPages: customersData?.data?.pagination?.totalPages || 0,
    },
    summary: {
      total: customersData?.data?.summary?.total || 0,
      active: customersData?.data?.summary?.active || 0,
      vip: customersData?.data?.summary?.vip || 0,
      totalVotes: customersData?.data?.summary?.totalVotes || 0,
    },
    addCustomer,
    updateCustomer,
    deleteCustomer,
    grantAccess,
    revokeAccess,
    restoreAccess,
    bulkAddCustomers,
    bulkUpdateAccess,
    syncFromShopify,
    syncFromWooCommerce,
    syncFromSource,
    refetch,
    refetchCustomer,
  };
}

interface UseCustomerOptions {
  email: string;
  enabled?: boolean;
}

interface UseCustomerReturn {
  customer: AllowedCustomer | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useCustomer({ email, enabled = true }: UseCustomerOptions): UseCustomerReturn {
  const {
    data: customerData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ success: boolean; customer: AllowedCustomer | null; found: boolean }, ApiError>({
    queryKey: ['customers', 'detail', email],
    queryFn: () => emailGatingApi.getCustomerByEmail(email),
    enabled: enabled && !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    customer: customerData?.customer || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseCustomerAnalyticsReturn {
  analytics: CustomerAnalyticsResponse['data']['analytics'] | null;
  insights: any;
  recommendations: string[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useCustomerAnalytics(options: { timeRange?: string; includeTimeline?: boolean } = {}): UseCustomerAnalyticsReturn {
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CustomerAnalyticsResponse, ApiError>({
    queryKey: ['customers', 'analytics', options],
    queryFn: () => emailGatingApi.getAnalytics(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    analytics: analyticsData?.data?.analytics || null,
    insights: analyticsData?.data?.insights || null,
    recommendations: analyticsData?.data?.recommendations || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseEmailGatingSettingsReturn {
  settings: any;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
  updateSettings: UseMutationResult<any, ApiError, any>;
}

export function useEmailGatingSettings(): UseEmailGatingSettingsReturn {
  const queryClient = useQueryClient();
  
  const {
    data: settingsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['email-gating', 'settings'],
    queryFn: emailGatingApi.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateSettings = useMutation({
    mutationFn: emailGatingApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-gating', 'settings'] });
    },
  });

  return {
    settings: settingsData?.data?.settings || null,
    isLoading,
    isError,
    error,
    refetch,
    updateSettings,
  };
}
