// src/hooks/use-customers.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { CustomerListResponse, Customer } from '@/lib/apis/customers';

interface CustomerAnalyticsResponse {
  data: {
    analytics: any;
    insights: any;
    recommendations: string[];
  };
}
import * as customersApi from '@/lib/apis/customers';
import { ApiError } from '@/lib/errors';

interface UseCustomersOptions {
  source?: 'manual' | 'shopify' | 'woocommerce' | 'csv' | 'api';
  hasAccess?: boolean;
  isActive?: boolean;
  vipStatus?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'email' | 'firstName' | 'lastName' | 'lastVoteAt' | 'totalVotes';
  sortOrder?: 'asc' | 'desc';
}

interface UseCustomersReturn {
  // Data
  customers: Customer[];
  customer: Customer | null;
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
  addCustomer: UseMutationResult<Customer, ApiError, {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }>;
  updateCustomer: UseMutationResult<Customer, ApiError, { id: string; data: Partial<Customer> }>;
  deleteCustomer: UseMutationResult<{ success: boolean }, ApiError, string>;
  grantAccess: UseMutationResult<{ success: boolean; customer: Customer; granted: any; impact: string }, ApiError, { customerId: string; reason?: string }>;
  revokeAccess: UseMutationResult<{ success: boolean; customer: Customer; revocation: any; impact: any }, ApiError, { customerId: string; reason?: string }>;
  restoreAccess: UseMutationResult<{ success: boolean; customer: Customer; restoration: any; impact: string }, ApiError, string>;
  
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
  syncFromSource: UseMutationResult<any, ApiError, 'shopify' | 'woocommerce'>;
  
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
    queryFn: () => customersApi.customersApi.getCustomers({
      source,
      status: isActive ? 'active' : undefined,
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
  const addCustomer = useMutation<Customer, ApiError, {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }>({
    mutationFn: customersApi.customersApi.addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Update customer mutation
  const updateCustomer = useMutation<Customer, ApiError, { id: string; data: Partial<Customer> }>({
    mutationFn: ({ id, data }) => customersApi.customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Delete customer mutation
  const deleteCustomer = useMutation<{ success: boolean }, ApiError, string>({
    mutationFn: customersApi.customersApi.removeCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Grant access mutation
  const grantAccess = useMutation<{
    success: boolean;
    customer: Customer;
    granted: any;
    impact: string;
  }, ApiError, { customerId: string; reason?: string }>({
    mutationFn: ({ customerId, reason }: { customerId: string; reason?: string }) =>
      customersApi.customersApi.grantAccess(customerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Revoke access mutation
  const revokeAccess = useMutation<{
    success: boolean;
    customer: Customer;
    revocation: any;
    impact: any;
  }, ApiError, { customerId: string; reason?: string }>({
    mutationFn: ({ customerId, reason }: { customerId: string; reason?: string }) =>
      customersApi.customersApi.revokeAccess(customerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Restore access mutation
  const restoreAccess = useMutation<{
    success: boolean;
    customer: Customer;
    restoration: any;
    impact: string;
  }, ApiError, string>({
    mutationFn: (customerId: string) => customersApi.customersApi.restoreAccess(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Bulk add customers mutation
  const bulkAddCustomers = useMutation<any, ApiError, Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    vipStatus?: boolean;
    externalCustomerId?: string;
  }>>({
    mutationFn: customersApi.customersApi.bulkAddCustomers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Bulk update access mutation
  const bulkUpdateAccess = useMutation<any, ApiError, {
    customerIds: string[];
    action: 'grant' | 'revoke';
    reason?: string;
  }>({
    mutationFn: (data: {
      customerIds: string[];
      action: 'grant' | 'revoke' | 'restore';
      reason?: string;
    }) => customersApi.customersApi.bulkUpdateAccess(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from Shopify mutation
  const syncFromShopify = useMutation<any, ApiError, void>({
    mutationFn: () => customersApi.customersApi.syncCustomers('shopify'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from WooCommerce mutation
  const syncFromWooCommerce = useMutation<any, ApiError, void>({
    mutationFn: () => customersApi.customersApi.syncCustomers('woocommerce'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Sync from source mutation
  const syncFromSource = useMutation<any, ApiError, 'shopify' | 'woocommerce'>({
    mutationFn: (source: 'shopify' | 'woocommerce') => customersApi.customersApi.syncCustomers(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
  });

  // Refetch specific customer
  const refetchCustomer = (email: string) => {
    queryClient.invalidateQueries({ queryKey: ['customers', 'detail', email] });
  };

  return {
    customers: customersData?.customers || [],
    customer: null, // Will be set by useCustomer hook
    isLoading,
    isError,
    error,
    pagination: {
      page: customersData?.pagination?.page || 1,
      limit: customersData?.pagination?.limit || 20,
      total: customersData?.pagination?.total || 0,
      totalPages: customersData?.pagination?.totalPages || 0,
    },
    summary: {
      total: customersData?.analytics?.totalCustomers || 0,
      active: customersData?.analytics?.activeCustomers || 0,
      vip: 0, // VIP customers not available in current analytics
      totalVotes: customersData?.analytics?.averageVotesPerCustomer || 0,
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
  customer: Customer | null;
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
  } = useQuery<{ success: boolean; customer: Customer | null; found: boolean }, ApiError>({
    queryKey: ['customers', 'detail', email],
    queryFn: () => customersApi.customersApi.getCustomerByEmail(email),
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
    queryFn: () => customersApi.customersApi.getAnalytics(options),
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
  } = useQuery<{ data: { settings: any } }, ApiError>({
    queryKey: ['email-gating', 'settings'],
    queryFn: customersApi.customersApi.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const updateSettings = useMutation<any, ApiError, any>({
    mutationFn: customersApi.customersApi.updateSettings,
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
