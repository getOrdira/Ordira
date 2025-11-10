// src/lib/validation/middleware/responseHandlers.ts
// Response handling helpers aligned with backend response utilities.

import axios, { AxiosError, AxiosResponse } from 'axios';

import { ApiError } from '@/lib/errors/errors';
import type { ApiResponse } from '@/lib/types/core';

import {
  apiLogger,
  createLogContextFromAxiosConfig,
  createLogContextFromAxiosError,
  createLogContextFromResponse,
  LogContext
} from './apiLogger';
import {
  buildErrorResponse,
  handleApiError,
  NormalizedFrontendError,
  ErrorResponse
} from './apiError';

interface AxiosRequestMetadata {
  metadata?: {
    startTime?: number;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: unknown;
  timestamp: string;
  requestId?: string;
}

export interface ResponseHandlerOptions {
  successMessage?: string;
  fallbackErrorMessage?: string;
  context?: Partial<LogContext>;
}

const extractRequestId = (response: AxiosResponse): string | undefined => {
  return (response.headers?.['x-request-id'] as string | undefined) ??
    ((response.data as { _requestId?: string } | undefined)?._requestId);
};

const extractDuration = (response: AxiosResponse): number | undefined => {
  const configWithMeta = response.config as typeof response.config & AxiosRequestMetadata;
  const startTime = configWithMeta.metadata?.startTime;
  return startTime ? Date.now() - startTime : undefined;
};

const ensurePayloadSuccess = <T>(
  payload: ApiResponse<T> | undefined,
  statusCode: number,
  options?: ResponseHandlerOptions
): { data: T; message?: string; meta?: unknown } => {
  if (!payload) {
    throw new ApiError(options?.fallbackErrorMessage ?? 'Empty response payload', statusCode);
  }

  if (!payload.success) {
    throw new ApiError(
      payload.message || options?.fallbackErrorMessage || 'Request failed',
      statusCode || 400,
      payload.code,
      payload
    );
  }

  const data = payload.data;
  if (data === undefined || data === null) {
    throw new ApiError(options?.fallbackErrorMessage ?? 'Response missing data', statusCode || 400);
  }

  const meta = (() => {
    if (payload && typeof payload === 'object') {
      if ('meta' in payload) {
        return (payload as { meta?: unknown }).meta;
      }
      if ('pagination' in payload) {
        return (payload as { pagination?: unknown }).pagination;
      }
    }
    return undefined;
  })();

  return {
    data,
    message: payload.message,
    meta
  };
};

export const handleAxiosSuccess = <T>(
  response: AxiosResponse<ApiResponse<T>>,
  options?: ResponseHandlerOptions
): SuccessResponse<T> => {
  const requestId = extractRequestId(response);
  const duration = extractDuration(response);
  const baseContext = options?.context ?? {};

  const context = apiLogger.createContext({
    ...baseContext,
    requestId,
    method: response.config?.method?.toUpperCase(),
    endpoint: response.config?.url,
    statusCode: response.status,
    duration
  });

  try {
    const { data, message, meta } = ensurePayloadSuccess(response.data, response.status, options);

    apiLogger.info(options?.successMessage ?? 'API request succeeded', context);

    return {
      success: true,
      data,
      message,
      meta,
      timestamp: new Date().toISOString(),
      requestId
    };
  } catch (error) {
    const normalizedError = handleApiError(error, context);
    throw normalizedError;
  }
};

export interface ErrorHandlingResult {
  error: NormalizedFrontendError;
  response: ErrorResponse;
}

export const processAxiosError = (
  error: unknown,
  options?: ResponseHandlerOptions
): ErrorHandlingResult => {
  const derivedContext: Partial<LogContext> | undefined = options?.context
    ?? (axios.isAxiosError(error) ? createLogContextFromAxiosError(error) : undefined);

  const normalized = handleApiError(error, derivedContext);
  const errorResponse = buildErrorResponse(normalized, derivedContext);

  return {
    error: normalized,
    response: errorResponse
  };
};

export const handleAxiosError = (
  error: unknown,
  options?: ResponseHandlerOptions
): never => {
  const result = processAxiosError(error, options);
  throw result.error;
};

export const withApiResponseHandling = async <T>(
  request: () => Promise<AxiosResponse<ApiResponse<T>>>,
  options?: ResponseHandlerOptions
): Promise<SuccessResponse<T>> => {
  try {
    const response = await request();
    return handleAxiosSuccess(response, options);
  } catch (error) {
    handleAxiosError(error, options);
    throw error as never;
  }
};

export const createRequestLogContext = (config: AxiosResponse['config']): LogContext => {
  return createLogContextFromAxiosConfig(config);
};

export const createResponseLogContext = (response: AxiosResponse): LogContext => {
  return createLogContextFromResponse(response);
};

