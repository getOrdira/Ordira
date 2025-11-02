// services/infrastructure/types/core/typeGuards.service.ts

/**
 * Core type guards for safe type checking and validation
 */

// ===== PRIMITIVE TYPE GUARDS =====

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if value is an object (not null, not array)
 */
export function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if value is null or undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// ===== VALIDATION TYPE GUARDS =====

/**
 * Type guard to check if value is a valid MongoDB ObjectId string
 */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

/**
 * Type guard to check if value is a valid email
 * Optimized regex for better performance
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard to check if value is a valid URL
 * Optimized with try-catch for invalid URLs
 */
export function isUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if value is a valid date string
 */
export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = Date.parse(value);
  return !isNaN(date) && date > 0;
}

/**
 * Type guard to check if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(value);
}

/**
 * Type guard to check if value is a valid UUID
 */
export function isUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Type guard to check if value is a valid hex color
 */
export function isHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value);
}

// ===== ARRAY TYPE GUARDS =====

/**
 * Type guard to check if value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Type guard to check if value is an array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number' && !isNaN(item));
}

/**
 * Type guard to check if value is an array of objects
 */
export function isObjectArray(value: unknown): value is Record<string, any>[] {
  return Array.isArray(value) && value.every(item => isObject(item));
}

/**
 * Type guard to check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// ===== MONGODB DOCUMENT TYPE GUARDS =====

/**
 * Type guard to check if object has MongoDB document properties
 */
export function hasMongoDocumentProperties(obj: unknown): obj is { _id: any; createdAt?: Date; updatedAt?: Date } {
  return isObject(obj) && '_id' in obj;
}

/**
 * Type guard to check if object has createdAt property
 */
export function hasCreatedAt(obj: unknown): obj is { createdAt: Date } {
  return isObject(obj) && 'createdAt' in obj && obj.createdAt instanceof Date;
}

/**
 * Type guard to check if object has updatedAt property
 */
export function hasUpdatedAt(obj: unknown): obj is { updatedAt: Date } {
  return isObject(obj) && 'updatedAt' in obj && obj.updatedAt instanceof Date;
}

// ===== SAFE CONVERSION UTILITIES =====

/**
 * Safe string conversion with validation
 */
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

/**
 * Safe number conversion with validation
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * Safe integer conversion with validation
 */
export function safeInteger(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * Safe boolean conversion with validation
 */
export function safeBoolean(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
}

/**
 * Safe date conversion with validation
 */
export function safeDate(value: unknown, fallback?: Date): Date {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return fallback || new Date();
}

// ===== UTILITY FUNCTIONS =====

/**
 * Safe property access with fallback
 * Optimized for performance
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (!isObject(obj)) {
    return fallback;
  }
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !isObject(current)) {
      return fallback;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : fallback;
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(arr: unknown, index: number, fallback: T): T {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return fallback;
  }
  return arr[index] as T;
}

/**
 * Check if object has a specific property
 */
export function hasProperty(obj: unknown, property: string | symbol): boolean {
  return isObject(obj) && property in obj;
}

/**
 * Check if object has all specified properties
 */
export function hasAllProperties(obj: unknown, properties: string[]): boolean {
  if (!isObject(obj)) return false;
  return properties.every(prop => prop in obj);
}

/**
 * Check if object has any of the specified properties
 */
export function hasAnyProperty(obj: unknown, properties: string[]): boolean {
  if (!isObject(obj)) return false;
  return properties.some(prop => prop in obj);
}

// ===== REQUEST ACCESSOR FUNCTIONS =====
// Note: These are here to avoid circular dependencies with requestGuards

import { Request } from 'express';

/**
 * Safely access request body with type checking
 */
export function getRequestBody<T = any>(req: Request): T | undefined {
  return 'body' in req ? req.body as T : undefined;
}

/**
 * Safely access request query with type checking
 */
export function getRequestQuery<T = any>(req: Request): T | undefined {
  return 'query' in req ? req.query as T : undefined;
}

/**
 * Safely access request params with type checking
 */
export function getRequestParams<T = any>(req: Request): T | undefined {
  return 'params' in req ? req.params as T : undefined;
}

/**
 * Safely access request headers with type checking
 */
export function getRequestHeaders(req: Request): Record<string, string | string[] | undefined> | undefined {
  return 'headers' in req ? req.headers : undefined;
}

/**
 * Safely access request IP address
 */
export function getRequestIp(req: Request): string | undefined {
  return 'ip' in req ? req.ip : undefined;
}

/**
 * Safely access request hostname
 */
export function getRequestHostname(req: Request): string | undefined {
  return 'hostname' in req ? req.hostname : undefined;
}

/**
 * Safely access request path
 */
export function getRequestPath(req: Request): string | undefined {
  return 'path' in req ? req.path : undefined;
}

/**
 * Safely access request URL
 */
export function getRequestUrl(req: Request): string | undefined {
  return 'url' in req ? req.url : undefined;
}

