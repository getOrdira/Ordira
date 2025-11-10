'use client';

// src/hooks/features/brands/useBrandRecommendation.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandRecommendationApi, {
  type ImprovementRecommendationParams,
  type RecommendationParams
} from '@/lib/api/features/brands/brandRecommendation.api';
import type { Recommendation } from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type RecommendationQueryOptions = Omit<
  UseQueryOptions<Recommendation[], ApiError, Recommendation[], QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

export const brandRecommendationQueryKeys = {
  root: ['brands', 'recommendation'] as const,
  personalized: (params?: RecommendationParams) =>
    [...brandRecommendationQueryKeys.root, 'personalized', normalizeParams(params)] as const,
  improvements: (params?: ImprovementRecommendationParams) =>
    [...brandRecommendationQueryKeys.root, 'improvements', normalizeParams(params)] as const
};

export const brandRecommendationMutationKeys = {
  generate: [...brandRecommendationQueryKeys.root, 'generate'] as const
};

export const usePersonalizedBrandRecommendations = (
  params?: RecommendationParams,
  options?: RecommendationQueryOptions
): UseQueryResult<Recommendation[], ApiError> => {
  return useQuery({
    queryKey: brandRecommendationQueryKeys.personalized(params),
    queryFn: () => brandRecommendationApi.getPersonalizedRecommendations(params),
    ...options
  });
};

export const useImprovementRecommendations = (
  params?: ImprovementRecommendationParams,
  options?: RecommendationQueryOptions
): UseQueryResult<Recommendation[], ApiError> => {
  return useQuery({
    queryKey: brandRecommendationQueryKeys.improvements(params),
    queryFn: () => brandRecommendationApi.getImprovementRecommendations(params),
    ...options
  });
};

export const useGeneratePersonalizedRecommendations = (
  options?: MutationConfig<Recommendation[], RecommendationParams | undefined>
): UseMutationResult<Recommendation[], ApiError, RecommendationParams | undefined, unknown> => {
  return useMutation({
    mutationKey: brandRecommendationMutationKeys.generate,
    mutationFn: (params?: RecommendationParams) =>
      brandRecommendationApi.generatePersonalizedRecommendations(params),
    ...options
  });
};
