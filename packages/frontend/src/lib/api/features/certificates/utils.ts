// src/lib/api/features/certificates/utils.ts
// Shared helpers for certificates API modules built on top of core primitives

import { ValidationError } from '@/lib/errors/errors';
import {
  sanitizeString as primitiveSanitizeString,
  sanitizeOptionalString as primitiveSanitizeOptionalString,
  sanitizeBoolean as primitiveSanitizeBoolean,
  sanitizeOptionalBoolean as primitiveSanitizeOptionalBoolean,
  sanitizePositiveInteger as primitiveSanitizePositiveInteger,
  sanitizeNumber as primitiveSanitizeNumber,
  sanitizeObjectId as primitiveSanitizeObjectId,
  sanitizeOptionalObjectId as primitiveSanitizeOptionalObjectId,
  sanitizeArray as primitiveSanitizeArray,
  sanitizeEnum as primitiveSanitizeEnum,
  sanitizeOptionalEnum as primitiveSanitizeOptionalEnum,
  sanitizeJsonObject as primitiveSanitizeJsonObject,
  sanitizeOptionalDate as primitiveSanitizeOptionalDate,
} from '@/lib/validation/sanitizers/primitives';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

const throwValidationError = (field: string, message: string): never => {
  throw new ValidationError(message, field);
};

export const sanitizeString = (
  value: unknown,
  { fieldName, minLength, maxLength, allowEmpty = false }: { fieldName: string; minLength?: number; maxLength?: number; allowEmpty?: boolean }
): string => {
  return primitiveSanitizeString(value, fieldName, {
    minLength,
    maxLength,
    allowEmpty,
  });
};

export const sanitizeOptionalString = (
  value: unknown,
  options: { fieldName: string; minLength?: number; maxLength?: number; allowEmpty?: boolean }
): string | undefined => {
  return primitiveSanitizeOptionalString(value, options.fieldName, {
    minLength: options.minLength,
    maxLength: options.maxLength,
    allowEmpty: options.allowEmpty,
  });
};

export const sanitizeBoolean = (value: unknown, fieldName: string): boolean => {
  return primitiveSanitizeBoolean(value, fieldName);
};

export const sanitizeOptionalBoolean = (value: unknown, fieldName: string): boolean | undefined => {
  return primitiveSanitizeOptionalBoolean(value, fieldName);
};

export const sanitizeNumberInRange = (
  value: unknown,
  { fieldName, min, max }: { fieldName: string; min: number; max: number }
): number => {
  return primitiveSanitizeNumber(value, fieldName, { min, max, integer: true });
};

export const sanitizePositiveInteger = (
  value: unknown,
  { fieldName, min = 1, max = Number.MAX_SAFE_INTEGER }: { fieldName: string; min?: number; max?: number }
): number => {
  return primitiveSanitizePositiveInteger(value, fieldName, { min, max });
};

export const sanitizeOptionalPositiveInteger = (
  value: unknown,
  options: { fieldName: string; min?: number; max?: number }
): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return sanitizePositiveInteger(value, {
    fieldName: options.fieldName,
    min: options.min,
    max: options.max,
  });
};

export const sanitizeDateInput = (value: string | Date | undefined, fieldName: string): string | undefined => {
  const date = primitiveSanitizeOptionalDate(value, fieldName);
  return date ? date.toISOString() : undefined;
};

export const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const CONTACT_METHODS = ['email', 'sms', 'wallet'] as const;

export const sanitizeContactMethod = (value: string): 'email' | 'sms' | 'wallet' => {
  return primitiveSanitizeEnum(value, 'contactMethod', CONTACT_METHODS);
};

export const sanitizeRecipientByContactMethod = (recipient: string, contactMethod: 'email' | 'sms' | 'wallet'): string => {
  const sanitized = sanitizeString(recipient, { fieldName: 'recipient', maxLength: 320 });
  switch (contactMethod) {
    case 'email':
      if (!EMAIL_REGEX.test(sanitized)) {
        throwValidationError('recipient', 'recipient must be a valid email address');
      }
      break;
    case 'sms':
      if (!PHONE_REGEX.test(sanitized)) {
        throwValidationError('recipient', 'recipient must be a valid E.164 phone number');
      }
      break;
    case 'wallet':
      if (!ETH_ADDRESS_REGEX.test(sanitized)) {
        throwValidationError('recipient', 'recipient must be a valid Ethereum address');
      }
      break;
  }
  return sanitized;
};

export const sanitizeEthereumAddress = (value: string, fieldName = 'address'): string => {
  const sanitized = sanitizeString(value, { fieldName, maxLength: 128 });
  if (!ETH_ADDRESS_REGEX.test(sanitized)) {
    throwValidationError(fieldName, `${fieldName} must be a valid Ethereum address`);
  }
  return sanitized;
};

export const sanitizeObjectId = (value: string, fieldName = 'id'): string => {
  return primitiveSanitizeObjectId(value, fieldName);
};

export const sanitizeOptionalObjectId = (value: string | undefined, fieldName = 'id'): string | undefined => {
  return primitiveSanitizeOptionalObjectId(value, fieldName);
};

export const sanitizeObjectIdArray = (values: string[], fieldName: string): string[] => {
  return primitiveSanitizeArray(values, fieldName, (item, index) =>
    sanitizeObjectId(item as string, `${fieldName}[${index}]`),
  { minLength: 1 });
};

const SORT_ORDER_VALUES = ['asc', 'desc'] as const;
export const sanitizeSortOrder = (value: string | undefined): 'asc' | 'desc' | undefined => {
  return primitiveSanitizeOptionalEnum(value, 'sortOrder', SORT_ORDER_VALUES);
};

const OWNERSHIP_TYPES = ['relayer', 'brand', 'all'] as const;
export const sanitizeOwnershipType = (value: string | undefined): 'relayer' | 'brand' | 'all' | undefined => {
  return primitiveSanitizeOptionalEnum(value, 'ownershipType', OWNERSHIP_TYPES);
};

const TRANSFER_STATUS = ['relayer', 'brand', 'failed'] as const;
export const sanitizeTransferStatus = (value: string | undefined): 'relayer' | 'brand' | 'failed' | undefined => {
  return primitiveSanitizeOptionalEnum(value, 'transferStatus', TRANSFER_STATUS);
};

export const sanitizeStatus = (value: string | undefined, fieldName = 'status'): string | undefined => {
  return sanitizeOptionalString(value, { fieldName, maxLength: 50 });
};

export const sanitizePlan = (value: string | undefined, fieldName = 'plan'): string | undefined => {
  return sanitizeOptionalString(value, { fieldName, maxLength: 50 });
};

const CERTIFICATE_STATUS = ['revoked', 'minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed'] as const;
export const sanitizeCertificateStatus = (value: string, fieldName = 'status'): string => {
  return primitiveSanitizeEnum(value, fieldName, CERTIFICATE_STATUS);
};

const PRIORITY_VALUES = ['standard', 'priority', 'urgent'] as const;
export const sanitizePriority = (value: string | undefined): 'standard' | 'priority' | 'urgent' | undefined => {
  return primitiveSanitizeOptionalEnum(value, 'priority', PRIORITY_VALUES);
};

export const sanitizeSortBy = (value: string | undefined): string | undefined => {
  return sanitizeOptionalString(value, { fieldName: 'sortBy', maxLength: 64 });
};

export const sanitizeSearchTerm = (value: string | undefined): string | undefined => {
  return sanitizeOptionalString(value, { fieldName: 'searchTerm', maxLength: 100 });
};

export const sanitizeRecipient = (value: string | undefined): string | undefined => {
  return sanitizeOptionalString(value, { fieldName: 'recipient', maxLength: 320 });
};

export const sanitizeCertificateIds = (ids: string[]): string[] => {
  const sanitized = sanitizeObjectIdArray(ids, 'certificateIds');
  if (sanitized.length > 100) {
    throwValidationError('certificateIds', 'certificateIds cannot contain more than 100 items');
  }
  return sanitized;
};

export const ensureNonEmptyObject = (value: Record<string, unknown>, fieldName: string): Record<string, unknown> => {
  const sanitized = primitiveSanitizeJsonObject<Record<string, unknown>>(value, fieldName);
  if (Object.keys(sanitized).length === 0) {
    throwValidationError(fieldName, `${fieldName} cannot be empty`);
  }
  return sanitized;
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

