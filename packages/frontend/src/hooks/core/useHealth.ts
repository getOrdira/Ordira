'use client';

// src/hooks/core/useHealth.ts

import {
  useQuery,
  type UseQueryResult
} from '@tanstack/react-query';

import healthApi, {
  type BasicHealthResponse,
  type DetailedHealthResponse,
  type LivenessResponse,
  type ReadinessResponse
} from '@/lib/api/core/health.api';
import { ApiError } from '@/lib/errors/errors';
import { type FeatureQueryOptions } from '@/hooks/query';

export const healthQueryKeys = {
  root: ['core', 'health'] as const,
  basic: () => [...healthQueryKeys.root, 'basic'] as const,
  detailed: () => [...healthQueryKeys.root, 'detailed'] as const,
  readiness: () => [...healthQueryKeys.root, 'readiness'] as const,
  liveness: () => [...healthQueryKeys.root, 'liveness'] as const
} as const;

export interface UseHealthOptions {
  basic?: FeatureQueryOptions<BasicHealthResponse>;
  detailed?: FeatureQueryOptions<DetailedHealthResponse>;
  readiness?: FeatureQueryOptions<ReadinessResponse>;
  liveness?: FeatureQueryOptions<LivenessResponse>;
}

export interface UseHealthResult {
  basic: UseQueryResult<BasicHealthResponse, ApiError>;
  detailed: UseQueryResult<DetailedHealthResponse, ApiError>;
  readiness: UseQueryResult<ReadinessResponse, ApiError>;
  liveness: UseQueryResult<LivenessResponse, ApiError>;
}

/**
 * React Query powered access to the core health endpoints.
 * Consumers can opt-in to detailed/readiness/liveness checks by
 * providing `enabled` flags through the optional configuration.
 */
export const useHealth = (options: UseHealthOptions = {}): UseHealthResult => {
  const basicOptions = (options.basic ?? {}) as FeatureQueryOptions<BasicHealthResponse>;
  const detailedOptions = (options.detailed ?? {}) as FeatureQueryOptions<DetailedHealthResponse>;
  const readinessOptions = (options.readiness ?? {}) as FeatureQueryOptions<ReadinessResponse>;
  const livenessOptions = (options.liveness ?? {}) as FeatureQueryOptions<LivenessResponse>;

  const { enabled: detailedEnabled, ...detailedRest } = detailedOptions;
  const { enabled: readinessEnabled, ...readinessRest } = readinessOptions;
  const { enabled: livenessEnabled, ...livenessRest } = livenessOptions;

  const basic = useQuery<BasicHealthResponse, ApiError>({
    queryKey: healthQueryKeys.basic(),
    queryFn: healthApi.basicHealth,
    staleTime: 30_000,
    ...basicOptions
  });

  const detailed = useQuery<DetailedHealthResponse, ApiError>({
    queryKey: healthQueryKeys.detailed(),
    queryFn: healthApi.detailedHealth,
    enabled: detailedEnabled ?? false,
    staleTime: 60_000,
    ...detailedRest
  });

  const readiness = useQuery<ReadinessResponse, ApiError>({
    queryKey: healthQueryKeys.readiness(),
    queryFn: healthApi.readiness,
    enabled: readinessEnabled ?? false,
    staleTime: 30_000,
    ...readinessRest
  });

  const liveness = useQuery<LivenessResponse, ApiError>({
    queryKey: healthQueryKeys.liveness(),
    queryFn: healthApi.liveness,
    enabled: livenessEnabled ?? false,
    staleTime: 15_000,
    ...livenessRest
  });

  return {
    basic,
    detailed,
    readiness,
    liveness
  };
};
