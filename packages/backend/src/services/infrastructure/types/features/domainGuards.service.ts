// services/infrastructure/types/features/domainGuards.service.ts
import { isObject } from '../core/typeGuards.service';

/**
 * Domain-specific type guards for application entities
 */

/**
 * Type guard for API key objects
 */
export function isApiKeyObject(obj: unknown): obj is { keyId?: string; key?: string; _id?: any } {
  return isObject(obj) && ('keyId' in obj || 'key' in obj || '_id' in obj);
}

/**
 * Type guard for notification objects with priority
 */
export function hasPriority(obj: unknown): obj is { priority: string } {
  return isObject(obj) && 'priority' in obj && typeof obj.priority === 'string';
}

/**
 * Type guard for product objects with view count
 */
export function hasViewCount(obj: unknown): obj is { viewCount?: number } {
  return isObject(obj) && 'viewCount' in obj;
}

/**
 * Type guard for brand settings with Shopify access token
 */
export function hasShopifyAccessToken(obj: unknown): obj is { shopifyAccessToken?: string } {
  return isObject(obj) && 'shopifyAccessToken' in obj;
}

/**
 * Type guard for supply chain settings
 */
export function hasSupplyChainSettings(obj: unknown): obj is { supplyChainSettings?: { contractDeployedAt?: Date } } {
  return isObject(obj) && 'supplyChainSettings' in obj;
}

/**
 * Type guard for objects with pagination metadata
 */
export function hasPagination(obj: unknown): obj is {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
} {
  return isObject(obj) && ('page' in obj || 'limit' in obj || 'total' in obj);
}

/**
 * Type guard for objects with timestamp properties
 */
export function hasTimestamps(obj: unknown): obj is { createdAt?: Date; updatedAt?: Date } {
  return isObject(obj) && ('createdAt' in obj || 'updatedAt' in obj);
}

