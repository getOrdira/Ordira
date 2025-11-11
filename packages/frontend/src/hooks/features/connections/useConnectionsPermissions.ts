'use client';

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import connectionsPermissionsApi from '@/lib/api/features/connections/connectionsPermissions.api';
import type { FeatureAccessResult } from '@backend/services/connections/features/permissions.service';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

type FeatureAccessParams = Parameters<typeof connectionsPermissionsApi.getFeatureAccess>[0];
type FeatureRequestPayload = Parameters<typeof connectionsPermissionsApi.canUseFeature>[0];
type FeatureTogglePayload = Parameters<
  typeof connectionsPermissionsApi.validateFeatureTogglePayload
>[0];
type FeatureExplanation = Awaited<
  ReturnType<typeof connectionsPermissionsApi.explainFeatureAccess>
>;

export const connectionsPermissionsQueryKeys = {
  root: ['connections', 'permissions'] as const,
  access: (params?: FeatureAccessParams) =>
    [...connectionsPermissionsQueryKeys.root, 'access', normalizeParams(params)] as const
};

export const connectionsPermissionsMutationKeys = {
  canUse: [...connectionsPermissionsQueryKeys.root, 'can-use'] as const,
  explain: [...connectionsPermissionsQueryKeys.root, 'explain'] as const,
  validateToggle: [...connectionsPermissionsQueryKeys.root, 'validate-toggle'] as const
};

export const useConnectionFeatureAccess = (
  params?: FeatureAccessParams,
  options?: QueryOptions<FeatureAccessResult>
): UseQueryResult<FeatureAccessResult, ApiError> => {
  return useQuery({
    queryKey: connectionsPermissionsQueryKeys.access(params),
    queryFn: () => connectionsPermissionsApi.getFeatureAccess(params),
    ...options
  });
};

export const useConnectionFeatureCheck = (
  options?: MutationConfig<boolean, FeatureRequestPayload>
): UseMutationResult<boolean, ApiError, FeatureRequestPayload, unknown> => {
  return useMutation({
    mutationKey: connectionsPermissionsMutationKeys.canUse,
    mutationFn: connectionsPermissionsApi.canUseFeature,
    ...options
  });
};

export const useExplainConnectionFeatureAccess = (
  options?: MutationConfig<FeatureExplanation, FeatureRequestPayload>
): UseMutationResult<FeatureExplanation, ApiError, FeatureRequestPayload, unknown> => {
  return useMutation({
    mutationKey: connectionsPermissionsMutationKeys.explain,
    mutationFn: connectionsPermissionsApi.explainFeatureAccess,
    ...options
  });
};

export const useValidateConnectionFeatureToggle = (
  options?: MutationConfig<boolean, FeatureTogglePayload>
): UseMutationResult<boolean, ApiError, FeatureTogglePayload, unknown> => {
  return useMutation({
    mutationKey: connectionsPermissionsMutationKeys.validateToggle,
    mutationFn: connectionsPermissionsApi.validateFeatureTogglePayload,
    ...options
  });
};
