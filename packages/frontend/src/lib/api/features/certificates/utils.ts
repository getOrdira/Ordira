// src/lib/api/features/certificates/utils.ts
// Shared helpers for certificates API modules

import { ApiError } from '@/lib/errors';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

const isDev = process.env.NODE_ENV === 'development';

export const logDebug = (scope: string, message: string, context?: Record<string, unknown>): void => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(`[certificatesApi:${scope}] ${message}`, context ?? {});
  }
};

export const logError = (scope: string, message: string, error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(`[certificatesApi:${scope}] ${message}`, error);
};

const throwValidationError = (message: string): never => {
  throw new ApiError(message, 400, 'CLIENT_VALIDATION_ERROR');
};

export const sanitizeObjectId = (value: string, fieldName = 'id'): string => {
  if (typeof value !== 'string') {
    throwValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!OBJECT_ID_REGEX.test(trimmed)) {
    throwValidationError(`${fieldName} must be a valid object identifier`);
  }

  return trimmed;
};

export const sanitizeOptionalObjectId = (value: string | undefined, fieldName = 'id'): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeObjectId(value, fieldName);
};

export const sanitizeString = (
  value: string,
  { fieldName, maxLength, allowEmpty = false }: { fieldName: string; maxLength?: number; allowEmpty?: boolean }
): string => {
  if (typeof value !== 'string') {
    throwValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (!allowEmpty && trimmed.length === 0) {
    throwValidationError(`${fieldName} cannot be empty`);
  }

  if (maxLength && trimmed.length > maxLength) {
    throwValidationError(`${fieldName} must be shorter than ${maxLength + 1} characters`);
  }

  return trimmed;
};

export const sanitizeOptionalString = (
  value: string | undefined,
  options: { fieldName: string; maxLength?: number; allowEmpty?: boolean }
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return sanitizeString(value, options);
};

export const sanitizeBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throwValidationError(`${fieldName} must be a boolean value`);
};

export const sanitizeOptionalBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return sanitizeBoolean(value, fieldName);
};

export const sanitizeNumberInRange = (
  value: unknown,
  { fieldName, min, max }: { fieldName: string; min: number; max: number }
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throwValidationError(`${fieldName} must be an integer`);
  }

  if (parsed < min || parsed > max) {
    throwValidationError(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
};

export const sanitizePositiveInteger = (
  value: unknown,
  { fieldName, min = 1, max = Number.MAX_SAFE_INTEGER }: { fieldName: string; min?: number; max?: number }
): number => {
  return sanitizeNumberInRange(value, { fieldName, min, max });
};

export const sanitizeOptionalPositiveInteger = (
  value: unknown,
  options: { fieldName: string; min?: number; max?: number }
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return sanitizePositiveInteger(value, options);
};

export const sanitizeDateInput = (value: string | Date | undefined, fieldName: string): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throwValidationError(`${fieldName} must be a valid date`);
    }
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throwValidationError(`${fieldName} must be a valid date`);
    }
    return parsed.toISOString();
  }

  throwValidationError(`${fieldName} must be a valid date`);
};

export const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const sanitizeContactMethod = (value: string): 'email' | 'sms' | 'wallet' => {
  const sanitized = sanitizeString(value, { fieldName: 'contactMethod', maxLength: 20 });
  if (sanitized === 'email' || sanitized === 'sms' || sanitized === 'wallet') {
    return sanitized;
  }
  throwValidationError("contactMethod must be one of 'email', 'sms', or 'wallet'");
};

export const sanitizeRecipientByContactMethod = (recipient: string, contactMethod: 'email' | 'sms' | 'wallet'): string => {
  const sanitized = sanitizeString(recipient, { fieldName: 'recipient', maxLength: 320 });
  switch (contactMethod) {
    case 'email':
      if (!EMAIL_REGEX.test(sanitized)) {
        throwValidationError('recipient must be a valid email address');
      }
      break;
    case 'sms':
      if (!PHONE_REGEX.test(sanitized)) {
        throwValidationError('recipient must be a valid E.164 phone number');
      }
      break;
    case 'wallet':
      if (!ETH_ADDRESS_REGEX.test(sanitized)) {
        throwValidationError('recipient must be a valid Ethereum address');
      }
      break;
  }
  return sanitized;
};

export const sanitizeEthereumAddress = (value: string, fieldName = 'address'): string => {
  const sanitized = sanitizeString(value, { fieldName, maxLength: 128 });
  if (!ETH_ADDRESS_REGEX.test(sanitized)) {
    throwValidationError(`${fieldName} must be a valid Ethereum address`);
  }
  return sanitized;
};

export const sanitizeNonEmptyArray = <T>(value: T[], fieldName: string): T[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throwValidationError(`${fieldName} must be a non-empty array`);
  }
  return value;
};

export const sanitizeObjectIdArray = (values: string[], fieldName: string): string[] => {
  return sanitizeNonEmptyArray(values, fieldName).map((id, index) => sanitizeObjectId(id, `${fieldName}[${index}]`));
};

export const sanitizeSortOrder = (value: string | undefined): 'asc' | 'desc' | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeString(value, { fieldName: 'sortOrder', maxLength: 4 });
  if (sanitized === 'asc' || sanitized === 'desc') {
    return sanitized;
  }
  throwValidationError("sortOrder must be 'asc' or 'desc'");
};

export const sanitizeOwnershipType = (value: string | undefined): 'relayer' | 'brand' | 'all' | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeString(value, { fieldName: 'ownershipType', maxLength: 10 });
  if (sanitized === 'relayer' || sanitized === 'brand' || sanitized === 'all') {
    return sanitized;
  }
  throwValidationError("ownershipType must be one of 'relayer', 'brand', or 'all'");
};

export const sanitizeTransferStatus = (value: string | undefined): 'relayer' | 'brand' | 'failed' | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeString(value, { fieldName: 'transferStatus', maxLength: 10 });
  if (sanitized === 'relayer' || sanitized === 'brand' || sanitized === 'failed') {
    return sanitized;
  }
  throwValidationError("transferStatus must be one of 'relayer', 'brand', or 'failed'");
};

export const sanitizeStatus = (value: string | undefined, fieldName = 'status'): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return sanitizeString(value, { fieldName, maxLength: 50 });
};

export const sanitizePlan = (value: string | undefined, fieldName = 'plan'): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeString(value, { fieldName, maxLength: 50 });
};

export const sanitizeCertificateStatus = (value: string, fieldName = 'status'): string => {
  const allowed = new Set([
    'revoked',
    'minted',
    'pending_transfer',
    'transferred_to_brand',
    'transfer_failed'
  ]);

  const sanitized = sanitizeString(value, { fieldName, maxLength: 50 });

  if (!allowed.has(sanitized)) {
    throwValidationError(`${fieldName} is invalid`);
  }

  return sanitized;
};

export const sanitizePriority = (value: string | undefined): 'standard' | 'priority' | 'urgent' | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const sanitized = sanitizeString(value, { fieldName: 'priority', maxLength: 10 });
  if (sanitized === 'standard' || sanitized === 'priority' || sanitized === 'urgent') {
    return sanitized;
  }

  throwValidationError("priority must be one of 'standard', 'priority', or 'urgent'");
};

export const sanitizeSortBy = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeString(value, { fieldName: 'sortBy', maxLength: 64 });
};

export const sanitizeSearchTerm = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeString(value, { fieldName: 'searchTerm', maxLength: 100 });
};

export const sanitizeRecipient = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return sanitizeString(value, { fieldName: 'recipient', maxLength: 320 });
};

export const sanitizeCertificateIds = (ids: string[]): string[] => {
  const sanitized = sanitizeObjectIdArray(ids, 'certificateIds');
  if (sanitized.length > 100) {
    throwValidationError('certificateIds cannot contain more than 100 items');
  }
  return sanitized;
};

export const ensureNonEmptyObject = (value: Record<string, unknown>, fieldName: string): Record<string, unknown> => {
  if (!value || Object.keys(value).length === 0) {
    throwValidationError(`${fieldName} cannot be empty`);
  }
  return value;
};

export const sanitizeRecipientCount = (count: unknown): number => {
  return sanitizeNumberInRange(count, { fieldName: 'recipientCount', min: 1, max: 5000 });
};

export const sanitizeMonthsBack = (value: unknown, fieldName = 'monthsBack'): number => {
  return sanitizeNumberInRange(value, { fieldName, min: 1, max: 24 });
};

export const sanitizeDays = (value: unknown, fieldName = 'days'): number => {
  return sanitizeNumberInRange(value, { fieldName, min: 1, max: 365 });
};


