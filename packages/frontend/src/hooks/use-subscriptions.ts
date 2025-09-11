// src/hooks/use-subscriptions.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { 
  Subscription, 
  SubscriptionListResponse, 
  SubscriptionDetailResponse, 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest,
  SubscriptionUpgradeRequest,
  SubscriptionDowngradeRequest,
  SubscriptionPauseRequest,
  SubscriptionResumeRequest,
  SubscriptionCancellationRequest,
  SubscriptionAnalyticsResponse
} from '@/lib/types/subscriptions';
import * as billingApi from '@/lib/api/billing';
import { ApiError } from '@/lib/errors';

interface UseSubscriptionsOptions {
  businessId?: string;
  tier?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  billingCycle?: 'monthly' | 'yearly';
  isTrialPeriod?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseSubscriptionsReturn {
  // Data
  subscriptions: Subscription[];
  subscription: Subscription | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Analytics
  analytics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    canceledSubscriptions: number;
    totalRevenue: number;
    averageUsage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
  };
  
  // Actions
  createSubscription: UseMutationResult<Subscription, ApiError, CreateSubscriptionRequest>;
  updateSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: UpdateSubscriptionRequest }>;
  upgradeSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: SubscriptionUpgradeRequest }>;
  downgradeSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: SubscriptionDowngradeRequest }>;
  pauseSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: SubscriptionPauseRequest }>;
  resumeSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: SubscriptionResumeRequest }>;
  cancelSubscription: UseMutationResult<Subscription, ApiError, { id: string; data: SubscriptionCancellationRequest }>;
  
  // Refetch functions
  refetch: () => void;
  refetchSubscription: (id: string) => void;
}

export function useSubscriptions(options: UseSubscriptionsOptions = {}): UseSubscriptionsReturn {
  const queryClient = useQueryClient();
  
  const {
    businessId,
    tier,
    status,
    billingCycle,
    isTrialPeriod,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Fetch subscriptions list
  const {
    data: subscriptionsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SubscriptionListResponse, ApiError>({
    queryKey: ['subscriptions', 'list', { businessId, tier, status, billingCycle, isTrialPeriod, page, limit, sortBy, sortOrder }],
    queryFn: () => billingApi.getSubscriptions({
      business: businessId,
      tier,
      status,
      billingCycle,
      isTrialPeriod,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create subscription mutation
  const createSubscription = useMutation<Subscription, ApiError, CreateSubscriptionRequest>({
    mutationFn: billingApi.createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Update subscription mutation
  const updateSubscription = useMutation<Subscription, ApiError, { id: string; data: UpdateSubscriptionRequest }>({
    mutationFn: ({ id, data }) => billingApi.updateSubscription(id, data),
    onSuccess: (updatedSubscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
      queryClient.setQueryData(['subscriptions', 'detail', updatedSubscription._id], updatedSubscription);
    },
  });

  // Upgrade subscription mutation
  const upgradeSubscription = useMutation<Subscription, ApiError, { id: string; data: SubscriptionUpgradeRequest }>({
    mutationFn: ({ id, data }) => billingApi.upgradeSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Downgrade subscription mutation
  const downgradeSubscription = useMutation<Subscription, ApiError, { id: string; data: SubscriptionDowngradeRequest }>({
    mutationFn: ({ id, data }) => billingApi.downgradeSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Pause subscription mutation
  const pauseSubscription = useMutation<Subscription, ApiError, { id: string; data: SubscriptionPauseRequest }>({
    mutationFn: ({ id, data }) => billingApi.pauseSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Resume subscription mutation
  const resumeSubscription = useMutation<Subscription, ApiError, { id: string; data: SubscriptionResumeRequest }>({
    mutationFn: ({ id, data }) => billingApi.resumeSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation<Subscription, ApiError, { id: string; data: SubscriptionCancellationRequest }>({
    mutationFn: ({ id, data }) => billingApi.cancelSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Refetch specific subscription
  const refetchSubscription = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions', 'detail', id] });
  };

  return {
    subscriptions: subscriptionsData?.subscriptions || [],
    subscription: null, // Will be set by useSubscription hook
    isLoading,
    isError,
    error,
    pagination: {
      page: subscriptionsData?.pagination?.page || 1,
      limit: subscriptionsData?.limit || 20,
      total: subscriptionsData?.pagination?.total || 0,
      totalPages: subscriptionsData?.pagination?.totalPages || 0,
      hasNext: subscriptionsData?.pagination?.hasNext || false,
      hasPrev: subscriptionsData?.pagination?.hasPrev || false,
    },
    analytics: {
      totalSubscriptions: subscriptionsData?.analytics?.totalSubscriptions || 0,
      activeSubscriptions: subscriptionsData?.analytics?.activeSubscriptions || 0,
      trialSubscriptions: subscriptionsData?.analytics?.trialSubscriptions || 0,
      canceledSubscriptions: subscriptionsData?.analytics?.canceledSubscriptions || 0,
      totalRevenue: subscriptionsData?.analytics?.totalRevenue || 0,
      averageUsage: subscriptionsData?.analytics?.averageUsage || {
        votes: 0,
        nfts: 0,
        apiCalls: 0,
        storage: 0,
      },
    },
    createSubscription,
    updateSubscription,
    upgradeSubscription,
    downgradeSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    refetch,
    refetchSubscription,
  };
}

interface UseSubscriptionOptions {
  id: string;
  enabled?: boolean;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  business: any;
  usage: any;
  billing: any;
  features: any;
  history: any[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSubscription({ id, enabled = true }: UseSubscriptionOptions): UseSubscriptionReturn {
  const {
    data: subscriptionData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SubscriptionDetailResponse, ApiError>({
    queryKey: ['subscriptions', 'detail', id],
    queryFn: () => billingApi.getSubscription(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    subscription: subscriptionData?.subscription || null,
    business: subscriptionData?.business || null,
    usage: subscriptionData?.usage || null,
    billing: subscriptionData?.billing || null,
    features: subscriptionData?.features || null,
    history: subscriptionData?.history || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseSubscriptionAnalyticsReturn {
  analytics: SubscriptionAnalyticsResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useSubscriptionAnalytics(): UseSubscriptionAnalyticsReturn {
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SubscriptionAnalyticsResponse, ApiError>({
    queryKey: ['subscriptions', 'analytics'],
    queryFn: billingApi.getSubscriptionAnalytics,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    analytics: analyticsData || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}
