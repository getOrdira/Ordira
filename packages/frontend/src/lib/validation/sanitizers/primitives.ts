// src/lib/validation/sanitizers/primitives.ts
// Core sanitization helpers aligned with backend dataSanitizer utilities.

import { ValidationError } from '@/lib/errors';

import { isPlainObject, isString, isNumber } from '../validators/runtimeGuards';
import { sanitizeEnvironmentForLogging } from '@/lib/security/sensitiveData';

// Shared sensitive-data helpers (mirrors backend dataSanitizer util)
export {
  type SensitivePattern,
  SENSITIVE_PATTERNS,
  SENSITIVE_FIELD_NAMES,
  sanitizeSensitiveString,
  sanitizeSensitiveFieldName,
  sanitizeSensitiveObject,
  sanitizeEnvironmentForLogging,
  sanitizeRequestDataForLogging,
  sanitizeErrorForLogging,
  createSafeSummary,
  hasSensitiveData,
  getSensitivePatterns
} from '@/lib/security/sensitiveData';

// ===== Validation helpers =====

const throwValidationError = (field: string, message: string, details?: unknown): never => {
  throw new ValidationError(message, field, details);
};

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined;

const isBlankString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length === 0;

export interface StringSanitizeOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: readonly string[];
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  trim?: boolean;
  allowEmpty?: boolean;
  defaultValue?: string;
  transform?: (value: string) => string;
}

export const sanitizeString = (value: unknown, field: string, options: StringSanitizeOptions = {}): string => {
  const {
    minLength,
    maxLength,
    pattern,
    allowedValues,
    toLowerCase,
    toUpperCase,
    trim = true,
    allowEmpty = false,
    defaultValue,
    transform
  } = options;

  if (isNil(value)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throwValidationError(field, `${field} is required`);
  }

  let stringValue = '';

  if (typeof value === 'string') {
    stringValue = value;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    stringValue = String(value);
  } else {
    throwValidationError(field, `${field} must be a string`);
  }

  if (trim) {
    stringValue = stringValue.trim();
  }

  if (!allowEmpty && stringValue.length === 0) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throwValidationError(field, `${field} cannot be empty`);
  }

  if (minLength !== undefined && stringValue.length < minLength) {
    throwValidationError(field, `${field} must be at least ${minLength} characters long`);
  }

  if (maxLength !== undefined && stringValue.length > maxLength) {
    throwValidationError(field, `${field} must be at most ${maxLength} characters long`);
  }

  if (pattern && !pattern.test(stringValue)) {
    throwValidationError(field, `${field} has an invalid format`);
  }

  if (allowedValues && !allowedValues.includes(stringValue)) {
    throwValidationError(field, `${field} must be one of: ${allowedValues.join(', ')}`);
  }

  if (toLowerCase) {
    stringValue = stringValue.toLowerCase();
  }

  if (toUpperCase) {
    stringValue = stringValue.toUpperCase();
  }

  return transform ? transform(stringValue) : stringValue;
};

export const sanitizeOptionalString = (
  value: unknown,
  field: string,
  options: StringSanitizeOptions = {}
): string | undefined => {
  if (isNil(value)) {
    return options.defaultValue;
  }
  return sanitizeString(value, field, options);
};

export interface NumberSanitizeOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  finite?: boolean;
  defaultValue?: number;
}

export const sanitizeNumber = (value: unknown, field: string, options: NumberSanitizeOptions = {}): number => {
  const { min, max, integer, positive, finite = true, defaultValue } = options;

  if (isNil(value) || isBlankString(value)) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throwValidationError(field, `${field} is required`);
  }

  let numericValue = Number.NaN;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    numericValue = Number(value.trim());
  } else {
    throwValidationError(field, `${field} must be a number`);
  }

  if (Number.isNaN(numericValue)) {
    throwValidationError(field, `${field} must be a valid number`);
  }

  if (finite && !Number.isFinite(numericValue)) {
    throwValidationError(field, `${field} must be a finite number`);
  }

  if (integer && !Number.isInteger(numericValue)) {
    throwValidationError(field, `${field} must be an integer`);
  }

  if (positive && numericValue <= 0) {
    throwValidationError(field, `${field} must be greater than 0`);
  }

  if (min !== undefined && numericValue < min) {
    throwValidationError(field, `${field} must be at least ${min}`);
  }

  if (max !== undefined && numericValue > max) {
    throwValidationError(field, `${field} must be at most ${max}`);
  }

  return numericValue;
};

export const sanitizeOptionalNumber = (
  value: unknown,
  field: string,
  options: NumberSanitizeOptions = {}
): number | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return options.defaultValue;
  }
  return sanitizeNumber(value, field, options);
};

export const sanitizeInteger = (value: unknown, field: string, options: NumberSanitizeOptions = {}): number => {
  return sanitizeNumber(value, field, { ...options, integer: true });
};

export const sanitizePositiveInteger = (value: unknown, field: string, options: NumberSanitizeOptions = {}): number => {
  return sanitizeNumber(value, field, { ...options, integer: true, positive: true });
};

export interface BooleanSanitizeOptions {
  defaultValue?: boolean;
}

export const sanitizeBoolean = (value: unknown, field: string, options: BooleanSanitizeOptions = {}): boolean => {
  if (isNil(value) || isBlankString(value)) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throwValidationError(field, `${field} is required`);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  throw new ValidationError(`${field} must be a boolean`, field);
};

export const sanitizeOptionalBoolean = (
  value: unknown,
  field: string,
  options: BooleanSanitizeOptions = {}
): boolean | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return options.defaultValue;
  }
  return sanitizeBoolean(value, field, options);
};

export const sanitizeDate = (value: unknown, field: string, options: { allowPast?: boolean; allowFuture?: boolean } = {}): Date => {
  const { allowPast = true, allowFuture = true } = options;

  if (isNil(value) || isBlankString(value)) {
    throwValidationError(field, `${field} is required`);
  }

  const date = value instanceof Date ? value : new Date(value as string);

  if (Number.isNaN(date.getTime())) {
    throwValidationError(field, `${field} must be a valid date`);
  }

  const now = Date.now();
  if (!allowPast && date.getTime() < now) {
    throwValidationError(field, `${field} must be a future date`);
  }

  if (!allowFuture && date.getTime() > now) {
    throwValidationError(field, `${field} must be a past date`);
  }

  return date;
};

export const sanitizeOptionalDate = (
  value: unknown,
  field: string,
  options: { allowPast?: boolean; allowFuture?: boolean } = {}
): Date | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return undefined;
  }
  return sanitizeDate(value, field, options);
};

export const sanitizeEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[], options: { defaultValue?: T } = {}): T => {
  if (isNil(value) || isBlankString(value)) {
    if (options.defaultValue !== undefined) {
      return options.defaultValue;
    }
    throwValidationError(field, `${field} is required`);
  }

  const stringValue = sanitizeString(value, field, { allowEmpty: false });
  if (!allowed.includes(stringValue as T)) {
    throwValidationError(field, `${field} must be one of: ${allowed.join(', ')}`);
  }
  return stringValue as T;
};

export const sanitizeOptionalEnum = <T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  options: { defaultValue?: T } = {}
): T | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return options.defaultValue;
  }
  return sanitizeEnum(value, field, allowed, options);
};

export const sanitizeJsonObject = <T extends Record<string, unknown>>(value: unknown, field: string): T => {
  if (!isPlainObject(value)) {
    throwValidationError(field, `${field} must be an object`);
  }
  return value as T;
};

export const sanitizeOptionalJsonObject = <T extends Record<string, unknown>>(
  value: unknown,
  field: string
): T | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeJsonObject<T>(value, field);
};

export const sanitizeArray = <T>(
  value: unknown,
  field: string,
  itemSanitizer: (item: unknown, index: number) => T,
  options: { minLength?: number; maxLength?: number } = {}
): T[] => {
  const { minLength, maxLength } = options;

  if (!Array.isArray(value)) {
    throwValidationError(field, `${field} must be an array`);
  }

  const arrayValue = value as unknown[];

  if (minLength !== undefined && arrayValue.length < minLength) {
    throwValidationError(field, `${field} must contain at least ${minLength} item(s)`);
  }

  if (maxLength !== undefined && arrayValue.length > maxLength) {
    throwValidationError(field, `${field} must contain at most ${maxLength} item(s)`);
  }

  return arrayValue.map((item, index) => itemSanitizer(item, index));
};

export const sanitizeOptionalArray = <T>(
  value: unknown,
  field: string,
  itemSanitizer: (item: unknown, index: number) => T,
  options: { minLength?: number; maxLength?: number } = {}
): T[] | undefined => {
  if (isNil(value)) {
    return undefined;
  }
  return sanitizeArray(value, field, itemSanitizer, options);
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const sanitizeObjectId = (value: unknown, field: string): string => {
  const objectId = sanitizeString(value, field, { allowEmpty: false });
  if (!OBJECT_ID_REGEX.test(objectId)) {
    throwValidationError(field, `${field} must be a valid MongoDB ObjectId`);
  }
  return objectId;
};

export const sanitizeOptionalObjectId = (value: unknown, field: string): string | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return undefined;
  }
  return sanitizeObjectId(value, field);
};

export const sanitizeUrl = (value: unknown, field: string, options: { allowedProtocols?: string[]; defaultValue?: string } = {}): string => {
  const { allowedProtocols = ['http:', 'https:'], defaultValue } = options;
  const urlString = sanitizeString(value, field, { defaultValue });

  try {
    const url = new URL(urlString);
    if (!allowedProtocols.includes(url.protocol)) {
      throw new ValidationError(
        `${field} must use one of the following protocols: ${allowedProtocols.join(', ')}`,
        field
      );
    }
    return url.toString();
  } catch (error) {
    throw new ValidationError(`${field} must be a valid URL`, field, error);
  }
};

export const sanitizeOptionalUrl = (
  value: unknown,
  field: string,
  options: { allowedProtocols?: string[]; defaultValue?: string } = {}
): string | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return options.defaultValue;
  }
  return sanitizeUrl(value, field, options);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sanitizeUuid = (value: unknown, field: string): string => {
  const uuid = sanitizeString(value, field, { allowEmpty: false });
  if (!UUID_REGEX.test(uuid)) {
    throwValidationError(field, `${field} must be a valid UUID`);
  }
  return uuid.toLowerCase();
};

export const sanitizeOptionalUuid = (value: unknown, field: string): string | undefined => {
  if (isNil(value) || isBlankString(value)) {
    return undefined;
  }
  return sanitizeUuid(value, field);
};

export const sanitizeSearchTerm = (value: unknown, field: string, options: { minLength?: number; maxLength?: number } = {}): string => {
  const { minLength = 2, maxLength = 100 } = options;
  return sanitizeString(value, field, {
    minLength,
    maxLength,
    trim: true,
    allowEmpty: false
  });
};

export const sanitizeMetadata = (value: unknown, field: string): Record<string, unknown> => {
  if (value === undefined || value === null) {
    return {};
  }
  const metadata = sanitizeJsonObject<Record<string, unknown>>(value, field);
  return sanitizeEnvironmentForLogging(metadata);
};

export const sanitizeOptionalMetadata = (value: unknown, field: string): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeMetadata(value, field);
};

export const assertIsString = (value: unknown, field: string): asserts value is string => {
  if (!isString(value)) {
    throwValidationError(field, `${field} must be a string`);
  }
};

export const assertIsNumber = (value: unknown, field: string): asserts value is number => {
  if (!isNumber(value)) {
    throwValidationError(field, `${field} must be a number`);
  }
};

export const assertIsPlainObject = (value: unknown, field: string): asserts value is Record<string, unknown> => {
  if (!isPlainObject(value)) {
    throwValidationError(field, `${field} must be an object`);
  }
};


