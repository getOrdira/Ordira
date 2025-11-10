// src/lib/errors/serializers.ts

import {
  ApiError,
  type SerializedError,
  getErrorCode,
  getErrorMessage,
  getFriendlyErrorMessage,
  getStatusCode
} from './errors';

export interface SerializeOptions {
  requestId?: string;
  includeStack?: boolean;
  includeDetails?: boolean;
  timestamp?: string;
  defaultMessage?: string;
}

export interface SerializedErrorResponse {
  success: false;
  error: {
    message: string;
    friendlyMessage: string;
    code?: string | number;
    statusCode: number;
    details?: unknown;
    requestId?: string;
    timestamp: string;
    context?: Record<string, unknown>;
  };
}

const normalizeError = (error: unknown, options?: SerializeOptions): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  const statusCode = getStatusCode(error);
  const code = getErrorCode(error);
  const message =
    (options?.defaultMessage && !error) ? options.defaultMessage : getErrorMessage(error);

  return new ApiError(message, statusCode, typeof code === 'string' ? code : undefined, undefined, {
    requestId: options?.requestId,
    timestamp: options?.timestamp
  });
};

export const serializeError = (
  error: unknown,
  options?: SerializeOptions
): SerializedError => {
  const normalized = normalizeError(error, options);
  const serialized = normalized.toJSON();

  serialized.requestId = serialized.requestId ?? options?.requestId;
  serialized.timestamp = serialized.timestamp ?? options?.timestamp ?? new Date().toISOString();

  if (!options?.includeDetails) {
    delete serialized.details;
    delete serialized.data;
  }

  if (!options?.includeStack) {
    delete serialized.stack;
  }

  return serialized;
};

export const serializeErrorForResponse = (
  error: unknown,
  options?: SerializeOptions
): SerializedErrorResponse => {
  const normalized = normalizeError(error, options);
  const serialized = serializeError(normalized, {
    ...options,
    includeDetails: options?.includeDetails ?? true,
    includeStack: false
  });

  return {
    success: false,
    error: {
      message: serialized.message,
      friendlyMessage: getFriendlyErrorMessage(normalized),
      code: serialized.code,
      statusCode: serialized.statusCode ?? 500,
      details: serialized.details,
      requestId: serialized.requestId,
      timestamp: serialized.timestamp ?? new Date().toISOString(),
      context: serialized.context
    }
  };
};

export const serializeErrorForLogging = (
  error: unknown,
  options?: SerializeOptions
): Record<string, unknown> => {
  const normalized = normalizeError(error, options);
  const serialized = serializeError(normalized, {
    ...options,
    includeDetails: true,
    includeStack: true
  });

  return {
    ...serialized,
    friendlyMessage: getFriendlyErrorMessage(normalized)
  };
};

