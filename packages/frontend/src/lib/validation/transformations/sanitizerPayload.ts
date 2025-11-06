// src/lib/validation/transformations/sanitizerPayload.ts
// Payload sanitization helpers aligned with backend controller sanitization patterns.

import { apiLogger, LogContext } from '../middleware/apiLogger';
import { normalizeApiError } from '../middleware/apiError';
import { sanitizeSensitiveObject } from '../sanitizers/primitives';

type Primitive = string | number | boolean | null | undefined;

interface BaseSanitizeOptions {
  stripUndefined?: boolean;
  stripNull?: boolean;
  stripEmptyString?: boolean;
  stripEmptyArrays?: boolean;
  stripEmptyObjects?: boolean;
  convertDates?: boolean;
  allowEmptyStringKeys?: readonly string[];
  maxDepth?: number;
  scope?: string;
  context?: Partial<LogContext>;
  log?: boolean;
}

interface SanitizePayloadInternalOptions extends Required<Omit<BaseSanitizeOptions,
  'allowEmptyStringKeys' | 'scope' | 'context' | 'log'
>> {
  allowEmptyFields: Set<string>;
}

const DEFAULT_SANITIZE_OPTIONS: Required<Omit<SanitizePayloadInternalOptions, 'allowEmptyFields'>> = {
  stripUndefined: true,
  stripNull: true,
  stripEmptyString: true,
  stripEmptyArrays: true,
  stripEmptyObjects: true,
  convertDates: true,
  maxDepth: 8
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const cloneIfNeeded = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return [...value] as unknown as T;
  }
  if (isPlainObject(value)) {
    return { ...(value as Record<string, unknown>) } as unknown as T;
  }
  return value;
};

const sanitizeStringValue = (
  value: string,
  key: string | null,
  options: SanitizePayloadInternalOptions
): { include: boolean; value?: string } => {
  const trimmed = value.trim();

  if (options.stripEmptyString && trimmed.length === 0 && (!key || !options.allowEmptyFields.has(key))) {
    return { include: false };
  }

  return { include: true, value: trimmed };
};

const sanitizeArray = (
  value: unknown[],
  key: string | null,
  depth: number,
  options: SanitizePayloadInternalOptions
): { include: boolean; value?: unknown[] } => {
  if (depth >= options.maxDepth) {
    return { include: false };
  }

  const sanitizedItems: unknown[] = [];
  value.forEach((item) => {
    const sanitized = sanitizeValue(item, key, depth + 1, options);
    if (sanitized.include) {
      sanitizedItems.push(sanitized.value);
    }
  });

  if (sanitizedItems.length === 0 && options.stripEmptyArrays) {
    return { include: false };
  }

  return { include: true, value: sanitizedItems };
};

const sanitizeObjectValue = (
  value: Record<string, unknown>,
  depth: number,
  options: SanitizePayloadInternalOptions
): { include: boolean; value?: Record<string, unknown> } => {
  if (depth >= options.maxDepth) {
    return { include: false };
  }

  const result: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, candidate]) => {
    const sanitized = sanitizeValue(candidate, key, depth + 1, options);
    if (sanitized.include) {
      result[key] = sanitized.value;
    }
  });

  if (Object.keys(result).length === 0 && options.stripEmptyObjects) {
    return { include: false };
  }

  return { include: true, value: result };
};

const sanitizeValue = (
  value: unknown,
  key: string | null,
  depth: number,
  options: SanitizePayloadInternalOptions
): { include: boolean; value?: unknown } => {
  if (value === undefined) {
    return options.stripUndefined ? { include: false } : { include: true, value: undefined };
  }

  if (value === null) {
    return options.stripNull ? { include: false } : { include: true, value: null };
  }

  if (value instanceof Date) {
    return { include: true, value: options.convertDates ? value.toISOString() : cloneIfNeeded(value) };
  }

  if (typeof value === 'string') {
    return sanitizeStringValue(value, key, options);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return { include: true, value };
  }

  if (Array.isArray(value)) {
    return sanitizeArray(value, key, depth, options);
  }

  if (isPlainObject(value)) {
    return sanitizeObjectValue(value, depth, options);
  }

  // Preserve File, Blob, FormData, Map, Set and other complex objects as-is.
  return { include: true, value };
};

const buildInternalOptions = (options?: BaseSanitizeOptions): SanitizePayloadInternalOptions => {
  const allowEmptyFields = new Set(options?.allowEmptyStringKeys ?? []);
  return {
    ...DEFAULT_SANITIZE_OPTIONS,
    ...options,
    allowEmptyFields
  };
};

const logSanitization = (
  scope: string,
  action: string,
  options: BaseSanitizeOptions | undefined,
  details: Record<string, unknown>
) => {
  if (!options?.log) {
    return;
  }

  const context = {
    ...apiLogger.createContext(options.context ?? {}),
    details: sanitizeSensitiveObject(details)
  } as LogContext;

  apiLogger.debug(`${scope}.${action}.success`, context);
};

const sanitize = <T>(
  payload: T,
  options?: BaseSanitizeOptions,
  action: string = 'sanitize'
): T => {
  const scope = options?.scope ?? 'sanitize';
  const internalOptions = buildInternalOptions(options);

  try {
    const sanitized = sanitizeValue(payload, null, 0, internalOptions);

    const sanitizedValue = sanitized.include
      ? (sanitized.value as T)
      : ((Array.isArray(payload) ? [] : {}) as unknown as T);

    logSanitization(scope, action, options, {
      input: sanitizeSensitiveObject(payload),
      output: sanitizeSensitiveObject(sanitizedValue)
    });

    return sanitizedValue;
  } catch (error) {
    const normalized = normalizeApiError(error);
    apiLogger.error(`${scope}.${action}.failed`, apiLogger.createContext(options?.context ?? {}), normalized as Error);
    throw normalized;
  }
};

export interface SanitizeQueryOptions extends BaseSanitizeOptions {
  asSearchParams?: boolean;
}

const convertQueryValue = (value: unknown): Primitive | Primitive[] | undefined => {
  if (Array.isArray(value)) {
    const flattened: Primitive[] = [];
    value.forEach((entry) => {
      const normalized = convertQueryValue(entry);
      if (Array.isArray(normalized)) {
        normalized.forEach((item) => {
          if (item !== undefined && item !== null) {
            flattened.push(item);
          }
        });
      } else if (normalized !== undefined && normalized !== null) {
        flattened.push(normalized);
      }
    });

    return flattened.length ? flattened : undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isPlainObject(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  return undefined;
};

export const sanitizeQueryParams = (
  params: Record<string, unknown> | undefined,
  options: SanitizeQueryOptions = {}
): Record<string, Primitive | Primitive[]> => {
  if (!params) {
    return {};
  }

  const sanitized = sanitize<Record<string, unknown>>(params, {
    stripEmptyArrays: true,
    stripEmptyObjects: true,
    stripEmptyString: true,
    stripNull: true,
    stripUndefined: true,
    convertDates: true,
    ...options
  }, 'query');

  return Object.entries(sanitized).reduce<Record<string, Primitive | Primitive[]>>((acc, [key, value]) => {
    const normalized = convertQueryValue(value);

    if (normalized === undefined) {
      return acc;
    }

    acc[key] = normalized;
    return acc;
  }, {});
};

export const toSearchParams = (
  params: Record<string, unknown> | undefined,
  options: SanitizeQueryOptions = {}
): URLSearchParams => {
  const sanitized = sanitizeQueryParams(params, options);
  const searchParams = new URLSearchParams();

  Object.entries(sanitized).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          searchParams.append(key, String(entry));
        }
      });
    } else if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
};

export const sanitizeRequestBody = <T>(payload: T, options?: BaseSanitizeOptions): T => {
  return sanitize(payload, {
    stripEmptyArrays: true,
    stripEmptyObjects: true,
    stripEmptyString: true,
    stripNull: true,
    stripUndefined: true,
    convertDates: true,
    ...options
  }, 'body');
};

export const mergeAndSanitizePayload = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  base: T,
  overrides: U,
  options?: BaseSanitizeOptions
): Partial<T & U> => {
  const merged = {
    ...cloneIfNeeded(base),
    ...cloneIfNeeded(overrides)
  } as Record<string, unknown>;

  return sanitize(merged, options, 'merge') as Partial<T & U>;
};

export const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  return sanitize(value, {
    stripUndefined: true,
    stripNull: true,
    stripEmptyArrays: true,
    stripEmptyObjects: true,
    stripEmptyString: true,
    convertDates: false,
    scope: 'compact'
  }) as Partial<T>;
};

