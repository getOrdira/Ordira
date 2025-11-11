'use client';

// src/hooks/features/manufacturers/useManufacturerScore.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import manufacturerScoreApi from '@/lib/api/features/manufacturers/manufacturerScore.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type CalculateInitialScorePayload = Parameters<
  typeof manufacturerScoreApi.calculateInitialScore
>[0];

type ManufacturerRecord = Parameters<
  typeof manufacturerScoreApi.calculateProfileScore
>[0];

export const manufacturerScoreMutationKeys = {
  initial: ['manufacturers', 'score', 'initial'] as const,
  profile: ['manufacturers', 'score', 'profile'] as const,
  completeness: ['manufacturers', 'score', 'completeness'] as const
};

export const useCalculateInitialManufacturerScore = (
  options?: MutationConfig<number, CalculateInitialScorePayload>
): UseMutationResult<number, ApiError, CalculateInitialScorePayload, unknown> => {
  return useMutation({
    mutationKey: manufacturerScoreMutationKeys.initial,
    mutationFn: manufacturerScoreApi.calculateInitialScore,
    ...options
  });
};

export const useCalculateManufacturerProfileScore = (
  options?: MutationConfig<number, ManufacturerRecord>
): UseMutationResult<number, ApiError, ManufacturerRecord, unknown> => {
  return useMutation({
    mutationKey: manufacturerScoreMutationKeys.profile,
    mutationFn: manufacturerScoreApi.calculateProfileScore,
    ...options
  });
};

export const useCalculateManufacturerProfileCompleteness = (
  options?: MutationConfig<number, ManufacturerRecord>
): UseMutationResult<number, ApiError, ManufacturerRecord, unknown> => {
  return useMutation({
    mutationKey: manufacturerScoreMutationKeys.completeness,
    mutationFn: manufacturerScoreApi.calculateProfileCompleteness,
    ...options
  });
};
