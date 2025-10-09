import { Types } from 'mongoose';
import { ProductOwner, ProductFilters } from './types';

/**
 * Product utility helper functions
 */

/**
 * Cache key generators
 */
export const CacheKeys = {
  product: (productId: string, ownerId?: string) => 
    `product:${productId}${ownerId ? `:${ownerId}` : ''}`,
  
  productListing: (filters: ProductFilters) => 
    `product_listing:${buildCacheKey('listing', filters)}`,
  
  productAnalytics: (owner: ProductOwner, dateRange?: any) => 
    `product_analytics:${owner.businessId || owner.manufacturerId}:${JSON.stringify(dateRange || {})}`,
  
  productByOwner: (ownerId: string, status?: string) => 
    `product_by_owner:${ownerId}${status ? `:${status}` : ''}`,

  productCategories: (ownerId?: string) =>
    `product_categories${ownerId ? `:${ownerId}` : ''}`
};

/**
 * Build cache key from params
 */
export function buildCacheKey(type: string, params: any): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as any);
  
  return `${type}:${JSON.stringify(sortedParams)}`;
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Validate string with optional requirements
 */
export function validateString(
  value: string | undefined,
  fieldName: string,
  minLength: number = 1
): { valid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}` 
    };
  }
  
  return { valid: true };
}

/**
 * Extract owner information from filters
 */
export function extractOwner(filters: ProductFilters | ProductOwner): ProductOwner {
  return {
    businessId: filters.businessId,
    manufacturerId: filters.manufacturerId
  };
}

/**
 * Get cache invalidation tags for product
 */
export function getProductCacheTags(businessId?: string, manufacturerId?: string): string[] {
  const tags = ['product_listing', 'product_analytics'];
  
  if (businessId) {
    tags.push(`business:${businessId}`);
  }
  
  if (manufacturerId) {
    tags.push(`manufacturer:${manufacturerId}`);
  }

  return tags;
}

/**
 * Build MongoDB query filter from product filters
 */
export function buildProductQuery(filters: ProductFilters): any {
  const query: any = {};
  
  if (filters.businessId) query.business = filters.businessId;
  if (filters.manufacturerId) query.manufacturer = filters.manufacturerId;
  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  
  // Price range filter
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    query.price = {};
    if (filters.priceMin !== undefined) query.price.$gte = filters.priceMin;
    if (filters.priceMax !== undefined) query.price.$lte = filters.priceMax;
  }

  // Text search
  if (filters.query) {
    query.$text = { $search: filters.query };
  }

  return query;
}

/**
 * Build sort options from filters
 */
export function buildSortOptions(filters: ProductFilters): any {
  const sort: any = {};
  
  // Text score sorting if searching
  if (filters.query) {
    sort.score = { $meta: 'textScore' };
  }
  
  // Primary sort field
  const sortBy = filters.sortBy || 'createdAt';
  sort[sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
  
  return sort;
}

/**
 * Calculate pagination values
 */
export function calculatePagination(filters: ProductFilters): { page: number; limit: number } {
  const limit = filters.limit || 20;
  const page = filters.offset ? Math.floor(filters.offset / limit) + 1 : 1;
  return { page, limit };
}

/**
 * Format product for API response
 */
export function formatProduct(product: any): any {
  return {
    ...product,
    specifications: product.specifications instanceof Map 
      ? Object.fromEntries(product.specifications)
      : product.specifications
  };
}

/**
 * Validate owner is provided
 */
export function validateOwner(businessId?: string, manufacturerId?: string): void {
  if (!businessId && !manufacturerId) {
    throw new Error('Either businessId or manufacturerId must be provided');
  }
}

/**
 * Get owner ID from either business or manufacturer
 */
export function getOwnerId(businessId?: string, manufacturerId?: string): string {
  return businessId || manufacturerId || '';
}

