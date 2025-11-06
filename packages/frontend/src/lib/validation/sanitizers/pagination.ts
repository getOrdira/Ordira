// src/lib/validation/sanitizers/pagination.ts
// Pagination and sorting sanitizers aligned with backend utilities.

import {
  sanitizeEnum,
  sanitizeNumber,
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from './primitives';

export interface PaginationInput {
  page?: unknown;
  limit?: unknown;
  offset?: unknown;
  sortBy?: unknown;
  sortOrder?: unknown;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  defaultOffset?: number;
  allowedSortFields?: readonly string[];
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

export interface SanitizedPagination {
  page: number;
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const sanitizeSortOrder = (
  value: unknown,
  field = 'sortOrder',
  options: { defaultValue?: 'asc' | 'desc' } = {}
): 'asc' | 'desc' | undefined => {
  const sanitized = sanitizeOptionalString(value, field, {
    allowedValues: ['asc', 'desc']
  });
  return (sanitized as 'asc' | 'desc' | undefined) ?? options.defaultValue;
};

export const sanitizeSortBy = (
  value: unknown,
  allowedFields: readonly string[] = [],
  field = 'sortBy',
  defaultValue?: string
): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const sanitized = sanitizeString(value, field, {
    trim: true,
    minLength: 1,
    maxLength: 120
  });

  if (allowedFields.length && !allowedFields.includes(sanitized)) {
    return defaultValue;
  }

  return sanitized;
};

export const sanitizePagination = (
  input: PaginationInput,
  options: PaginationOptions = {}
): SanitizedPagination => {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    defaultOffset = 0,
    allowedSortFields = [],
    defaultSortBy,
    defaultSortOrder
  } = options;

  const page = sanitizeOptionalNumber(input.page, 'page', { integer: true, positive: true, defaultValue: defaultPage }) ?? defaultPage;
  const limit = sanitizeOptionalNumber(input.limit, 'limit', { integer: true, positive: true, max: maxLimit, defaultValue: defaultLimit }) ?? defaultLimit;
  const offset = sanitizeOptionalNumber(input.offset, 'offset', { integer: true, min: 0, defaultValue: defaultOffset }) ?? defaultOffset;

  const sortBy = sanitizeSortBy(input.sortBy, allowedSortFields, 'sortBy', defaultSortBy);
  const sortOrder = sanitizeSortOrder(input.sortOrder, 'sortOrder', { defaultValue: defaultSortOrder });

  return {
    page,
    limit,
    offset,
    ...(sortBy ? { sortBy } : {}),
    ...(sortOrder ? { sortOrder } : {})
  };
};

export const sanitizeCursor = (value: unknown, field = 'cursor'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    trim: true,
    maxLength: 200,
    allowEmpty: false
  });
};

export const sanitizeDirection = (
  value: unknown,
  field = 'direction',
  options: { defaultValue?: 'forward' | 'backward' } = {}
): 'forward' | 'backward' | undefined => {
  return sanitizeOptionalEnum(value, field, ['forward', 'backward'] as const, options);
};

