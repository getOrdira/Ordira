// src/lib/validation/validators/runtimeGuards.ts
// Shared runtime type guards aligned with backend infrastructure guards.

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#(?:[A-Fa-f0-9]{3}){1,2}$/;

export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const isArray = Array.isArray;

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

export const isNullOrUndefined = (value: unknown): value is null | undefined => value === null || value === undefined;

export const isDefined = <T>(value: T | undefined | null): value is T => !isNullOrUndefined(value);

export const isDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

export const isDateString = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

export const isISODateString = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);

export const isObjectId = (value: unknown): value is string => typeof value === 'string' && OBJECT_ID_REGEX.test(value);

export const isUUID = (value: unknown): value is string => typeof value === 'string' && UUID_REGEX.test(value);

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && HEX_COLOR_REGEX.test(value);

export const isEmail = (value: unknown): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
};

export const isStringArray = (value: unknown): value is string[] => isArray(value) && value.every(isString);

export const isNumberArray = (value: unknown): value is number[] => isArray(value) && value.every(isNumber);

export const isObjectArray = (value: unknown): value is Record<string, unknown>[] =>
  isArray(value) && value.every(isPlainObject);

export const isNonEmptyArray = <T = unknown>(value: unknown): value is T[] => isArray(value) && value.length > 0;

export const hasProperty = <K extends PropertyKey>(
  value: unknown,
  property: K
): value is Record<K, unknown> => isPlainObject(value) && property in value;

export const hasAnyProperty = <K extends PropertyKey>(
  value: unknown,
  properties: readonly K[]
): value is Record<K, unknown> => isPlainObject(value) && properties.some((property) => property in value);

export const hasAllProperties = <K extends PropertyKey>(
  value: unknown,
  properties: readonly K[]
): value is Record<K, unknown> => isPlainObject(value) && properties.every((property) => property in value);

export const hasRequiredKeys = <K extends string>(
  value: unknown,
  keys: readonly K[]
): value is Record<K, unknown> => hasAllProperties(value, keys);

export const isRecordOf = <T>(
  value: unknown,
  predicate: (item: unknown) => item is T
): value is Record<string, T> => {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.values(value).every((item) => predicate(item));
};

export const isMapLike = (value: unknown): value is Map<unknown, unknown> | WeakMap<object, unknown> =>
  value instanceof Map || value instanceof WeakMap;

export const isSetLike = (value: unknown): value is Set<unknown> | WeakSet<object> =>
  value instanceof Set || value instanceof WeakSet;

export const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (isArray(value)) {
    return value;
  }

  if (isNullOrUndefined(value)) {
    return [];
  }

  return [value];
};

export const toOptionalDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) {
    return isDate(value) ? value : undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return isDate(parsed) ? parsed : undefined;
  }

  return undefined;
};