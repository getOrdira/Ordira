'use client';

// src/hooks/features/analytics/useAnalyticsReportGeneration.ts

import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';

import analyticsReportGenerationApi, {
  type AnalyticsReportFormat,
  type GenerateAnalyticsReportOptions,
  type GenerateAnalyticsReportResponse
} from '@/lib/api/features/analytics/analyticsReportGeneration.api';
import { ApiError } from '@/lib/errors/errors';

export type GenerateReportVariables<Format extends AnalyticsReportFormat = 'payload'> = {
  businessId: string;
  options: GenerateAnalyticsReportOptions<Format>;
};

export const analyticsReportGenerationMutationKey = ['analytics', 'report-generation'] as const;

export const useAnalyticsReportGeneration = <Format extends AnalyticsReportFormat = 'payload'>(
  options?: UseMutationOptions<
    GenerateAnalyticsReportResponse<Format>,
    ApiError,
    GenerateReportVariables<Format>
  >
): UseMutationResult<
  GenerateAnalyticsReportResponse<Format>,
  ApiError,
  GenerateReportVariables<Format>
> => {
  return useMutation({
    mutationKey: analyticsReportGenerationMutationKey,
    mutationFn: ({ businessId, options: requestOptions }) =>
      analyticsReportGenerationApi.generateReport<Format>(businessId, requestOptions),
    ...options
  });
};
