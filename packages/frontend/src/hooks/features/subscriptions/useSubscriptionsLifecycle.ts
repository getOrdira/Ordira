'use client';

// src/hooks/features/subscriptions/useSubscriptionsLifecycle.ts

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import subscriptionsLifecycleApi, {
  type CancelSubscriptionPayload,
  type CancelSubscriptionResult,
  type CreateSubscriptionPayload,
  type UpdateSubscriptionPayload
} from '@/lib/api/features/subscriptions/subscriptionsLifecycle.api';
import type { SubscriptionSummary } from '@/lib/types/features/subscriptions';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const subscriptionsLifecycleMutationKeys = {
  create: ['subscriptions', 'lifecycle', 'create'] as const,
  update: ['subscriptions', 'lifecycle', 'update'] as const,
  cancel: ['subscriptions', 'lifecycle', 'cancel'] as const,
  reactivate: ['subscriptions', 'lifecycle', 'reactivate'] as const
};

/**
 * Create a subscription.
 */
export const useCreateSubscription = (
  options?: MutationConfig<SubscriptionSummary, CreateSubscriptionPayload>
): UseMutationResult<SubscriptionSummary, ApiError, CreateSubscriptionPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsLifecycleMutationKeys.create,
    mutationFn: (payload) => subscriptionsLifecycleApi.createSubscription(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    ...options
  });
};

/**
 * Update subscription attributes.
 */
export const useUpdateSubscription = (
  options?: MutationConfig<SubscriptionSummary, UpdateSubscriptionPayload>
): UseMutationResult<SubscriptionSummary, ApiError, UpdateSubscriptionPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsLifecycleMutationKeys.update,
    mutationFn: (payload) => subscriptionsLifecycleApi.updateSubscription(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    ...options
  });
};

/**
 * Cancel a subscription.
 */
export const useCancelSubscription = (
  options?: MutationConfig<{ cancellation: CancelSubscriptionResult }, CancelSubscriptionPayload>
): UseMutationResult<
  { cancellation: CancelSubscriptionResult },
  ApiError,
  CancelSubscriptionPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsLifecycleMutationKeys.cancel,
    mutationFn: (payload) => subscriptionsLifecycleApi.cancelSubscription(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    ...options
  });
};

/**
 * Reactivate a subscription.
 */
export const useReactivateSubscription = (
  options?: MutationConfig<SubscriptionSummary, { businessId?: string } | undefined>
): UseMutationResult<SubscriptionSummary, ApiError, { businessId?: string } | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsLifecycleMutationKeys.reactivate,
    mutationFn: (payload) => subscriptionsLifecycleApi.reactivateSubscription(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all subscription lifecycle operations.
 */
export interface UseSubscriptionsLifecycleOptions {
  mutations?: {
    create?: MutationConfig<SubscriptionSummary, CreateSubscriptionPayload>;
    update?: MutationConfig<SubscriptionSummary, UpdateSubscriptionPayload>;
    cancel?: MutationConfig<{ cancellation: CancelSubscriptionResult }, CancelSubscriptionPayload>;
    reactivate?: MutationConfig<SubscriptionSummary, { businessId?: string } | undefined>;
  };
}

export interface UseSubscriptionsLifecycleResult {
  // Mutations
  create: UseMutationResult<SubscriptionSummary, ApiError, CreateSubscriptionPayload, unknown>;
  update: UseMutationResult<SubscriptionSummary, ApiError, UpdateSubscriptionPayload, unknown>;
  cancel: UseMutationResult<
    { cancellation: CancelSubscriptionResult },
    ApiError,
    CancelSubscriptionPayload,
    unknown
  >;
  reactivate: UseMutationResult<
    SubscriptionSummary,
    ApiError,
    { businessId?: string } | undefined,
    unknown
  >;
}

export const useSubscriptionsLifecycle = (
  options: UseSubscriptionsLifecycleOptions = {}
): UseSubscriptionsLifecycleResult => {
  const create = useCreateSubscription(options.mutations?.create);
  const update = useUpdateSubscription(options.mutations?.update);
  const cancel = useCancelSubscription(options.mutations?.cancel);
  const reactivate = useReactivateSubscription(options.mutations?.reactivate);

  return {
    create,
    update,
    cancel,
    reactivate
  };
};
