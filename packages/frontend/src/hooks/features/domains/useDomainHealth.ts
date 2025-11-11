'use client';

// src/hooks/features/domains/useDomainHealth.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import domainHealthApi from '@/lib/api/features/domains/domainHealth.api';
import type {
  DomainHealthCheckOptions,
  DomainHealthReport
} from '@backend/services/domains/features/domainHealth.service';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type HealthCheckVariables = {
  domainId: string;
  options?: DomainHealthCheckOptions;
};

export const domainHealthMutationKeys = {
  runCheck: ['domains', 'health', 'run-check'] as const
};

export const useDomainHealthCheck = (
  options?: MutationConfig<DomainHealthReport, HealthCheckVariables>
): UseMutationResult<DomainHealthReport, ApiError, HealthCheckVariables, unknown> => {
  return useMutation({
    mutationKey: domainHealthMutationKeys.runCheck,
    mutationFn: ({ domainId, options: checkOptions }) =>
      domainHealthApi.runHealthCheck(domainId, checkOptions),
    ...options
  });
};
