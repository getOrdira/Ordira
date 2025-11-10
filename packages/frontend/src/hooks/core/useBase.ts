'use client';

// src/hooks/core/useBase.ts

import { useMemo } from 'react';

import baseApi, { RouteConfigs } from '@/lib/api/core/base.api';

export interface UseBaseResult {
  routeConfigs: typeof RouteConfigs;
  createPaginationParams: typeof baseApi.createPaginationParams;
  createPaginationQueryString: typeof baseApi.createPaginationQueryString;
  extractPaginationMeta: typeof baseApi.extractPaginationMeta;
  handleResponse: typeof baseApi.handleResponse;
  handlePaginatedResponse: typeof baseApi.handlePaginatedResponse;
  validatePayload: typeof baseApi.validatePayload;
  validateAndSanitize: typeof baseApi.validateAndSanitize;
  validateBusinessId: typeof baseApi.validateBusinessId;
  validateManufacturerId: typeof baseApi.validateManufacturerId;
  validateUserId: typeof baseApi.validateUserId;
  createRequestMeta: typeof baseApi.createRequestMeta;
  sanitizeRequestData: typeof baseApi.sanitizeRequestData;
  sanitizeQueryParams: typeof baseApi.sanitizeQueryParams;
  buildQueryString: typeof baseApi.buildQueryString;
  getApiClient: typeof baseApi.getApiClient;
  withRetry: typeof baseApi.withRetry;
  batchRequests: typeof baseApi.batchRequests;
  withTimeout: typeof baseApi.withTimeout;
}

/**
 * Provides memoized access to the core base API utilities so components
 * can share the same helpers without re-instantiating them on each render.
 */
export const useBase = (): UseBaseResult => {
  return useMemo(
    () => ({
      routeConfigs: RouteConfigs,
      createPaginationParams: baseApi.createPaginationParams,
      createPaginationQueryString: baseApi.createPaginationQueryString,
      extractPaginationMeta: baseApi.extractPaginationMeta,
      handleResponse: baseApi.handleResponse,
      handlePaginatedResponse: baseApi.handlePaginatedResponse,
      validatePayload: baseApi.validatePayload,
      validateAndSanitize: baseApi.validateAndSanitize,
      validateBusinessId: baseApi.validateBusinessId,
      validateManufacturerId: baseApi.validateManufacturerId,
      validateUserId: baseApi.validateUserId,
      createRequestMeta: baseApi.createRequestMeta,
      sanitizeRequestData: baseApi.sanitizeRequestData,
      sanitizeQueryParams: baseApi.sanitizeQueryParams,
      buildQueryString: baseApi.buildQueryString,
      getApiClient: baseApi.getApiClient,
      withRetry: baseApi.withRetry,
      batchRequests: baseApi.batchRequests,
      withTimeout: baseApi.withTimeout
    }),
    []
  );
};
