// src/hooks/use-subscriptions.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { 
  Subscription, 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest,
  SubscriptionUpgradeRequest,
  SubscriptionDowngradeRequest,
  SubscriptionPauseRequest,
  SubscriptionResumeRequest,
  SubscriptionCancellationRequest
} from '@/lib/typessss/subscriptions';
import * as billingApi from '@/lib/apis/billing';
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
  createSubscription: UseMutationResult<any, ApiError, CreateSubscriptionRequest>;
  updateSubscription: UseMutationResult<any, ApiError, { id: string; data: UpdateSubscriptionRequest }>;
  upgradeSubscription: UseMutationResult<any, ApiError, { id: string; data: SubscriptionUpgradeRequest }>;
  downgradeSubscription: UseMutationResult<any, ApiError, { id: string; data: SubscriptionDowngradeRequest }>;
  pauseSubscription: UseMutationResult<any, ApiError, { id: string; data: SubscriptionPauseRequest }>;
  resumeSubscription: UseMutationResult<any, ApiError, { id: string; data: SubscriptionResumeRequest }>;
  cancelSubscription: UseMutationResult<any, ApiError, { id: string; data: SubscriptionCancellationRequest }>;
  
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
  } = useQuery<any, ApiError>({
    queryKey: ['subscriptions', 'list', { businessId, tier, status, billingCycle, isTrialPeriod, page, limit, sortBy, sortOrder }],
    queryFn: () => billingApi.billingApi.getBilling(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create subscription mutation
  const createSubscription = useMutation<any, ApiError, CreateSubscriptionRequest>({
    mutationFn: (data) => billingApi.billingApi.createCheckoutSession({ plan: (data as any).plan, couponCode: (data as any).couponCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Update subscription mutation
  const updateSubscription = useMutation<any, ApiError, { id: string; data: UpdateSubscriptionRequest }>({
    mutationFn: ({ id, data }) => billingApi.billingApi.changePlan({ plan: (data as any).plan, couponCode: (data as any).couponCode }),
    onSuccess: (updatedSubscription) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
      queryClient.setQueryData(['subscriptions', 'detail', updatedSubscription._id], updatedSubscription);
    },
  });

  // Upgrade subscription mutation
  const upgradeSubscription = useMutation<any, ApiError, { id: string; data: SubscriptionUpgradeRequest }>({
    mutationFn: ({ id, data }) => billingApi.billingApi.changePlan({ plan: (data as any).plan, couponCode: (data as any).couponCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Downgrade subscription mutation
  const downgradeSubscription = useMutation<any, ApiError, { id: string; data: SubscriptionDowngradeRequest }>({
    mutationFn: ({ id, data }) => billingApi.billingApi.changePlan({ plan: (data as any).plan, couponCode: (data as any).couponCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Pause subscription mutation
  const pauseSubscription = useMutation<any, ApiError, { id: string; data: SubscriptionPauseRequest }>({
    mutationFn: ({ id, data }) => billingApi.pauseSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Resume subscription mutation
  const resumeSubscription = useMutation<any, ApiError, { id: string; data: SubscriptionResumeRequest }>({
    mutationFn: ({ id, data }) => billingApi.resumeSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation<any, ApiError, { id: string; data: SubscriptionCancellationRequest }>({
    mutationFn: ({ id, data }) => billingApi.billingApi.cancelSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'list'] });
    },
  });

  // Refetch specific subscription
  const refetchSubscription = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions', 'detail', id] });
  };

  return {
    subscriptions: subscriptionsData ? [subscriptionsData] : [],
    subscription: subscriptionsData || null,
    isLoading,
    isError,
    error,
    pagination: {
      page: 1,
      limit: 20,
      total: subscriptionsData ? 1 : 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    analytics: {
      totalSubscriptions: subscriptionsData ? 1 : 0,
      activeSubscriptions: subscriptionsData?.status === 'active' ? 1 : 0,
      trialSubscriptions: subscriptionsData?.trialEnd ? 1 : 0,
      canceledSubscriptions: subscriptionsData?.cancelAtPeriodEnd ? 1 : 0,
      totalRevenue: 0,
      averageUsage: {
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
  } = useQuery<any, ApiError>({
    queryKey: ['subscriptions', 'detail', id],
    queryFn: () => billingApi.billingApi.getSubscription(),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    subscription: subscriptionData || null,
    business: null,
    usage: null,
    billing: subscriptionData || null,
    features: null,
    history: [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseSubscriptionAnalyticsReturn {
  analytics: any | null;
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
  } = useQuery<any, ApiError>({
    queryKey: ['subscriptions', 'analytics'],
    queryFn: () => billingApi.billingApi.getBillingAnalytics(),
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
