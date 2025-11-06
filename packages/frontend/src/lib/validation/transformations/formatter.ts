// src/lib/validation/transformations/formatter.ts
// Frontend data formatting utilities aligned with backend response helpers.

import type { FrontendApiResponse, PaginatedResponse, PaginationMeta, ResponseMeta } from '@/lib/types/core';

import { apiLogger, LogContext } from '../middleware/apiLogger';
import { normalizeApiError } from '../middleware/apiError';
import { sanitizeSensitiveObject } from '../sanitizers/primitives';

interface FormatLoggingOptions {
  context?: Partial<LogContext>;
  scope?: string;
  log?: boolean;
  logLevel?: 'debug' | 'info';
}

const DEFAULT_SCOPE = 'formatter';

const createLogContext = (options?: FormatLoggingOptions): LogContext => {
  return apiLogger.createContext(options?.context ?? {});
};

const logSuccess = (
  scope: string,
  action: string,
  options: FormatLoggingOptions | undefined,
  details: Record<string, unknown>
) => {
  if (!options?.log) {
    return;
  }

  const context = {
    ...createLogContext(options),
    ...sanitizeSensitiveObject(details)
  } as LogContext;

  if (options.logLevel === 'info') {
    apiLogger.info(`${scope}.${action}.success`, context);
  } else {
    apiLogger.debug(`${scope}.${action}.success`, context);
  }
};

const logFailure = (
  scope: string,
  action: string,
  options: FormatLoggingOptions | undefined,
  error: Error
) => {
  const context = createLogContext(options);
  apiLogger.error(`${scope}.${action}.failed`, context, error);
};

const addTimestamp = (meta?: Partial<ResponseMeta>): ResponseMeta | undefined => {
  if (!meta) {
    return undefined;
  }

  return {
    ...meta,
    timestamp: meta.timestamp ?? new Date().toISOString()
  };
};

export interface FormatResponseOptions<T> extends FormatLoggingOptions {
  message?: string;
  meta?: Partial<ResponseMeta>;
  transform?: (input: T) => T;
}

export const formatSuccessResponse = <T>(
  data: T,
  options: FormatResponseOptions<T> = {}
): FrontendApiResponse<T> => {
  const { message, meta, scope = DEFAULT_SCOPE, transform } = options;

  try {
    const transformedData = transform ? transform(data) : data;
    const timestamp = new Date().toISOString();
    const response: FrontendApiResponse<T> = {
      success: true,
      data: transformedData,
      message,
      meta: addTimestamp(meta),
      timestamp,
      _clientTimestamp: timestamp,
      _cacheKey: options.meta?.requestId,
      _requestId: options.meta?.requestId
    };

    logSuccess(scope, 'successResponse', options, {
      data: transformedData,
      meta: response.meta
    });

    return response;
  } catch (error) {
    const normalized = normalizeApiError(error);
    logFailure(scope, 'successResponse', options, normalized as Error);
    throw normalized;
  }
};

export interface FormatPaginatedResponseOptions<T> extends FormatResponseOptions<T[]> {
  pagination: PaginationMeta;
}

export const formatPaginatedResponse = <T>(
  data: T[],
  options: FormatPaginatedResponseOptions<T>
): PaginatedResponse<T> => {
  const { pagination, scope = DEFAULT_SCOPE } = options;

  try {
    const response = formatSuccessResponse<T[]>(data, options);
    const paginated: PaginatedResponse<T> = {
      ...response,
      pagination
    };

    logSuccess(scope, 'paginatedResponse', options, {
      pagination,
      meta: paginated.meta
    });

    return paginated;
  } catch (error) {
    const normalized = normalizeApiError(error);
    logFailure(scope, 'paginatedResponse', options, normalized as Error);
    throw normalized;
  }
};

export interface FormatCollectionOptions<T, R> extends FormatLoggingOptions {
  itemFormatter: (item: T, index: number) => R;
}

export const formatCollection = <T, R>(
  items: readonly T[] | undefined,
  options: FormatCollectionOptions<T, R>
): R[] => {
  const { itemFormatter, scope = DEFAULT_SCOPE } = options;

  if (!items || items.length === 0) {
    logSuccess(scope, 'collectionEmpty', options, { size: 0 });
    return [];
  }

  try {
    const formatted = items.map((item, index) => itemFormatter(item, index));

    logSuccess(scope, 'collectionFormatted', options, {
      size: formatted.length
    });

    return formatted;
  } catch (error) {
    const normalized = normalizeApiError(error);
    logFailure(scope, 'collectionFormatted', options, normalized as Error);
    throw normalized;
  }
};

export const mapPaginatedResponse = <T, R>(
  response: PaginatedResponse<T>,
  formatter: (item: T, index: number) => R,
  options?: FormatLoggingOptions
): PaginatedResponse<R> => {
  const scope = options?.scope ?? DEFAULT_SCOPE;

  try {
    const formattedData = formatCollection(response.data ?? [], {
      ...options,
      scope: `${scope}.mapPaginated` ,
      itemFormatter: formatter
    });

    const formattedResponse: PaginatedResponse<R> = {
      ...response,
      data: formattedData,
      meta: addTimestamp(response.meta),
      timestamp: response.timestamp ?? new Date().toISOString()
    };

    logSuccess(scope, 'mapPaginated', options, {
      pagination: response.pagination,
      meta: formattedResponse.meta
    });

    return formattedResponse;
  } catch (error) {
    const normalized = normalizeApiError(error);
    logFailure(scope, 'mapPaginated', options, normalized as Error);
    throw normalized;
  }
};

export const attachClientMetadata = <T>(
  response: FrontendApiResponse<T>,
  metadata: Record<string, unknown>
): FrontendApiResponse<T> => {
  return {
    ...response,
    meta: {
      ...response.meta,
      ...metadata,
      timestamp: response.meta?.timestamp ?? new Date().toISOString()
    }
  };
};

export const ensureResponseArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
};

export const formatOptionalDate = (value: string | number | Date | undefined | null): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export const formatNumber = (value: number | string | undefined | null, fallback = 0): number => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};


