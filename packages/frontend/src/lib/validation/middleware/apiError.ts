// src/lib/validation/middleware/apiError.ts
// Frontend error helpers aligned with backend error middleware patterns.

import axios, { AxiosError } from 'axios';

import {
  ApiError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  BusinessError,
  NetworkError,
  PlanLimitError,
  createErrorFromResponse,
  getErrorMessage as getMessageFromErrorHelper,
  getErrorStack as getStackFromErrorHelper,
  getErrorCode as getCodeFromErrorHelper,
  getStatusCode as getStatusCodeFromHelper
} from '@/lib/errors';

import { apiLogger, createLogContextFromAxiosError, LogContext } from './apiLogger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

export type NormalizedFrontendError =
  | ApiError
  | AuthError
  | ForbiddenError
  | NotFoundError
  | ValidationError
  | RateLimitError
  | BusinessError
  | PlanLimitError
  | NetworkError
  | Error;

export const getErrorMessage = getMessageFromErrorHelper;
export const getErrorStack = getStackFromErrorHelper;
export const getErrorCode = getCodeFromErrorHelper;
export const getStatusCode = getStatusCodeFromHelper;

export const createAppError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): AppError => {
  const error = new ApiError(message, statusCode, code, details);
  error.name = 'AppError';
  return error;
};

const mapAxiosError = (error: AxiosError): NormalizedFrontendError => {
  const normalized = createErrorFromResponse(error);
  if (normalized instanceof Error) {
    return normalized;
  }

  return new ApiError(getErrorMessage(normalized), error.response?.status ?? 500);
};

const mapUnknownError = (error: unknown): NormalizedFrontendError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return mapAxiosError(error);
  }

  if (typeof error === 'string') {
    return new ApiError(getMessageFromErrorHelper(error));
  }

  return new ApiError(getMessageFromErrorHelper(error), 500, 'UNKNOWN_ERROR');
};

export const normalizeApiError = (error: unknown): NormalizedFrontendError => {
  if (axios.isAxiosError(error)) {
    return mapAxiosError(error);
  }

  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ValidationError) {
    return error;
  }

  if (
    error instanceof AuthError ||
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof RateLimitError ||
    error instanceof BusinessError ||
    error instanceof PlanLimitError ||
    error instanceof NetworkError
  ) {
    return error;
  }

  return mapUnknownError(error);
};

const extractErrorDetails = (error: NormalizedFrontendError): unknown => {
  if (error instanceof ApiError) {
    return error.details ?? error.data;
  }

  if (error instanceof ValidationError) {
    return error.details ?? error.errors;
  }

  if (error instanceof PlanLimitError) {
    return {
      currentPlan: error.currentPlan,
      requiredPlan: error.requiredPlan
    };
  }

  return undefined;
};

export const buildErrorResponse = (
  error: NormalizedFrontendError,
  context?: Partial<LogContext>
): ErrorResponse => {
  const statusCode = getStatusCode(error);
  const code = getErrorCode(error) ?? (error instanceof ApiError ? error.code : undefined);

  return {
    success: false,
    error: getErrorMessage(error),
    code: typeof code === 'number' ? code.toString() : code,
    details: extractErrorDetails(error),
    timestamp: new Date().toISOString(),
    requestId: context?.requestId
  };
};

export const handleApiError = (
  error: unknown,
  context?: Partial<LogContext>
): NormalizedFrontendError => {
  const normalized = normalizeApiError(error);
  const logContext = context ? apiLogger.createContext(context) : undefined;

  if (axios.isAxiosError(error)) {
    apiLogger.logAxiosError(error, logContext);
  } else if (normalized instanceof Error) {
    apiLogger.logError(normalized, logContext);
  }

  return normalized;
};

export const handleApiErrorWithResponse = (
  error: unknown,
  context?: Partial<LogContext>
): ErrorResponse => {
  const normalized = handleApiError(error, context);
  const logContext = context ?? (axios.isAxiosError(error) ? createLogContextFromAxiosError(error) : undefined);
  return buildErrorResponse(normalized, logContext);
};

export const toAppError = (error: unknown): AppError => {
  const normalized = normalizeApiError(error);
  if (normalized instanceof ApiError) {
    return normalized;
  }

  if (normalized instanceof Error) {
    return createAppError(normalized.message, getStatusCode(normalized), getErrorCode(normalized) as string | undefined);
  }

  return createAppError(getErrorMessage(normalized));
};

export const isOperationalError = (error: unknown): boolean => {
  const normalized = normalizeApiError(error);
  if (normalized instanceof ApiError) {
    return normalized.statusCode < 500;
  }

  if (normalized instanceof ValidationError || normalized instanceof BusinessError || normalized instanceof PlanLimitError) {
    return true;
  }

  return false;
};

export const formatErrorForDisplay = (error: unknown): string => {
  if (error instanceof ValidationError) {
    return error.message;
  }

  return getMessageFromErrorHelper(error);
};

