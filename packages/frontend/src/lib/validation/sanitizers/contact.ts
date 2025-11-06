// src/lib/validation/sanitizers/contact.ts
// Contact-related sanitizers aligned with backend validation patterns.

import { sanitizeEnum, sanitizeOptionalString, sanitizeString } from './primitives';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

export const sanitizeEmail = (value: unknown, field = 'email'): string => {
  return sanitizeString(value, field, {
    pattern: EMAIL_REGEX,
    toLowerCase: true,
    trim: true,
    allowEmpty: false,
    maxLength: 320
  });
};

export const sanitizeOptionalEmail = (value: unknown, field = 'email'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    pattern: EMAIL_REGEX,
    toLowerCase: true,
    trim: true,
    maxLength: 320
  });
};

export const sanitizePhoneNumber = (value: unknown, field = 'phone'): string => {
  return sanitizeString(value, field, {
    pattern: PHONE_REGEX,
    trim: true,
    allowEmpty: false
  });
};

export const sanitizeOptionalPhoneNumber = (value: unknown, field = 'phone'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    pattern: PHONE_REGEX,
    trim: true
  });
};

export const sanitizeCountryCode = (value: unknown, field = 'countryCode'): string => {
  return sanitizeString(value, field, {
    trim: true,
    toUpperCase: true,
    minLength: 2,
    maxLength: 3
  });
};

export const sanitizeOptionalCountryCode = (value: unknown, field = 'countryCode'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    trim: true,
    toUpperCase: true,
    minLength: 2,
    maxLength: 3
  });
};

export const sanitizeContactMethod = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field = 'contactMethod'
): T => {
  return sanitizeEnum(value, field, allowedValues);
};

export const sanitizeOptionalContactMethod = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  field = 'contactMethod'
): T | undefined => {
  return value === undefined || value === null || value === ''
    ? undefined
    : sanitizeEnum(value, field, allowedValues);
};

export const sanitizeContactName = (value: unknown, field = 'name'): string => {
  return sanitizeString(value, field, {
    trim: true,
    minLength: 1,
    maxLength: 120
  });
};

export const sanitizeOptionalContactName = (value: unknown, field = 'name'): string | undefined => {
  return sanitizeOptionalString(value, field, {
    trim: true,
    minLength: 1,
    maxLength: 120
  });
};

