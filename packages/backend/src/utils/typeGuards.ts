// src/utils/typeGuards.ts
import { Request } from 'express';
import { UnifiedAuthRequest } from '../middleware/deprecated/unifiedAuth.middleware';

/**
 * Comprehensive type guards for safe type checking and casting
 */

// ===== REQUEST TYPE GUARDS =====

/**
 * Type guard to check if request has UnifiedAuthRequest properties
 */
export function isUnifiedAuthRequest(req: Request): req is UnifiedAuthRequest {
  return 'userId' in req && 'userType' in req;
}

/**
 * Type guard to check if request has validated body
 */
export function hasValidatedBody(req: Request): req is Request & { validatedBody: any } {
  return 'validatedBody' in req;
}

/**
 * Type guard to check if request has validated query
 */
export function hasValidatedQuery(req: Request): req is Request & { validatedQuery: any } {
  return 'validatedQuery' in req;
}

/**
 * Type guard to check if request has validated params
 */
export function hasValidatedParams(req: Request): req is Request & { validatedParams: any } {
  return 'validatedParams' in req;
}

/**
 * Type guard to check if request has tenant context
 */
export function hasTenantContext(req: Request): req is Request & { tenant: { business: { toString: () => string } } } {
  return 'tenant' in req && req.tenant && typeof req.tenant === 'object' && req.tenant !== null && 'business' in req.tenant;
}

/**
 * Type guard to check if request has userId property
 */
export function hasUserId(req: Request): req is Request & { userId: string } {
  return 'userId' in req && typeof req.userId === 'string';
}

/**
 * Type guard to check if request has performance tracking properties
 */
export function hasPerformanceTracking(req: Request): req is Request & { __sizeChecked?: boolean } {
  return '__sizeChecked' in req;
}

// ===== ERROR TYPE GUARDS =====

/**
 * Type guard to check if error has message property
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return error !== null && typeof error === 'object' && 'message' in error;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): error is { isOperational: boolean; statusCode?: number; code?: string } {
  return error !== null && typeof error === 'object' && 'isOperational' in error;
}

/**
 * Type guard to check if error has status code
 */
export function hasStatusCode(error: unknown): error is { statusCode: number } {
  return error !== null && typeof error === 'object' && 'statusCode' in error;
}

// ===== DATA TYPE GUARDS =====

/**
 * Type guard to check if value is a valid MongoDB ObjectId string
 */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

/**
 * Type guard to check if value is a valid email
 */
export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Type guard to check if value is a valid URL
 */
export function isUrl(value: unknown): value is string {
  try {
    return typeof value === 'string' && Boolean(new URL(value));
  } catch {
    return false;
  }
}

/**
 * Type guard to check if value is a valid date string
 */
export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !isNaN(Date.parse(value));
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
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}

/**
 * Type guard to check if value is an array of objects
 */
export function isObjectArray(value: unknown): value is Record<string, any>[] {
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null);
}

// ===== MONGODB DOCUMENT TYPE GUARDS =====

/**
 * Type guard to check if object has MongoDB document properties
 */
export function hasMongoDocumentProperties(obj: unknown): obj is { _id: any; createdAt?: Date; updatedAt?: Date } {
  return obj !== null && typeof obj === 'object' && '_id' in obj;
}

/**
 * Type guard to check if object has createdAt property
 */
export function hasCreatedAt(obj: unknown): obj is { createdAt: Date } {
  return obj !== null && typeof obj === 'object' && 'createdAt' in obj;
}

/**
 * Type guard to check if object has updatedAt property
 */
export function hasUpdatedAt(obj: unknown): obj is { updatedAt: Date } {
  return obj !== null && typeof obj === 'object' && 'updatedAt' in obj;
}

// ===== SAFE ACCESSOR FUNCTIONS =====

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

// ===== SPECIFIC DOMAIN TYPE GUARDS =====

/**
 * Type guard for API key objects
 */
export function isApiKeyObject(obj: unknown): obj is { keyId?: string; key?: string; _id?: any } {
  return obj !== null && typeof obj === 'object' && 
    ('keyId' in obj || 'key' in obj || '_id' in obj);
}

/**
 * Type guard for notification objects with priority
 */
export function hasPriority(obj: unknown): obj is { priority: string } {
  return obj !== null && typeof obj === 'object' && 'priority' in obj;
}

/**
 * Type guard for product objects with view count
 */
export function hasViewCount(obj: unknown): obj is { viewCount?: number } {
  return obj !== null && typeof obj === 'object' && 'viewCount' in obj;
}

/**
 * Type guard for brand settings with Shopify access token
 */
export function hasShopifyAccessToken(obj: unknown): obj is { shopifyAccessToken?: string } {
  return obj !== null && typeof obj === 'object' && 'shopifyAccessToken' in obj;
}

/**
 * Type guard for supply chain settings
 */
export function hasSupplyChainSettings(obj: unknown): obj is { supplyChainSettings?: { contractDeployedAt?: Date } } {
  return obj !== null && typeof obj === 'object' && 'supplyChainSettings' in obj;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Safe property access with fallback
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return fallback;
  }
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return fallback;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : fallback;
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(arr: unknown[], index: number, fallback: T): T {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return fallback;
  }
  return arr[index] as T;
}

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
    if (!isNaN(parsed)) {
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
    return value.toLowerCase() === 'true';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return fallback;
}
