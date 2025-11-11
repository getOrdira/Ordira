'use client';

// src/hooks/features/manufacturers/useManufacturerComparison.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import manufacturerComparisonApi from '@/lib/api/features/manufacturers/manufacturerComparison.api';
import type { ManufacturerComparisonResult } from '@/lib/types/features/manufacturers';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type CompareTwoParams = Parameters<typeof manufacturerComparisonApi.compareTwo>;
type FindSimilarParams = Parameters<typeof manufacturerComparisonApi.findSimilar>;
type MatchAgainstCriteriaParams = Parameters<
  typeof manufacturerComparisonApi.matchAgainstCriteria
>;
type RankManufacturersParams = Parameters<typeof manufacturerComparisonApi.rankManufacturers>;

type CompareTwoVariables = {
  manufacturer1: CompareTwoParams[0];
  manufacturer2: CompareTwoParams[1];
};

type FindSimilarVariables = {
  sourceManufacturer: FindSimilarParams[0];
  candidates: FindSimilarParams[1];
  threshold?: FindSimilarParams[2];
};

type MatchAgainstCriteriaVariables = {
  manufacturer: MatchAgainstCriteriaParams[0];
  criteria: MatchAgainstCriteriaParams[1];
};

type RankManufacturersVariables = {
  manufacturers: RankManufacturersParams[0];
  weights?: RankManufacturersParams[1];
};

export const manufacturerComparisonMutationKeys = {
  compareTwo: ['manufacturers', 'comparison', 'compare-two'] as const,
  findSimilar: ['manufacturers', 'comparison', 'find-similar'] as const,
  matchCriteria: ['manufacturers', 'comparison', 'match-criteria'] as const,
  rank: ['manufacturers', 'comparison', 'rank'] as const
};

export const useCompareManufacturers = (
  options?: MutationConfig<number, CompareTwoVariables>
): UseMutationResult<number, ApiError, CompareTwoVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerComparisonMutationKeys.compareTwo,
    mutationFn: ({ manufacturer1, manufacturer2 }) =>
      manufacturerComparisonApi.compareTwo(manufacturer1, manufacturer2),
    ...options
  });
};

export const useFindSimilarManufacturers = (
  options?: MutationConfig<ManufacturerComparisonResult[], FindSimilarVariables>
): UseMutationResult<
  ManufacturerComparisonResult[],
  ApiError,
  FindSimilarVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerComparisonMutationKeys.findSimilar,
    mutationFn: ({ sourceManufacturer, candidates, threshold }) =>
      manufacturerComparisonApi.findSimilar(sourceManufacturer, candidates, threshold),
    ...options
  });
};

export const useMatchManufacturerAgainstCriteria = (
  options?: MutationConfig<number, MatchAgainstCriteriaVariables>
): UseMutationResult<number, ApiError, MatchAgainstCriteriaVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerComparisonMutationKeys.matchCriteria,
    mutationFn: ({ manufacturer, criteria }) =>
      manufacturerComparisonApi.matchAgainstCriteria(manufacturer, criteria),
    ...options
  });
};

export const useRankManufacturers = (
  options?: MutationConfig<Array<Record<string, unknown>>, RankManufacturersVariables>
): UseMutationResult<
  Array<Record<string, unknown>>,
  ApiError,
  RankManufacturersVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerComparisonMutationKeys.rank,
    mutationFn: ({ manufacturers, weights }) =>
      manufacturerComparisonApi.rankManufacturers(manufacturers, weights),
    ...options
  });
};
