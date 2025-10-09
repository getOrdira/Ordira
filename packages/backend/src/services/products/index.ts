/**
 * Products Module - Root Export
 * @module services/products
 */

import { productDataService, productAccountService } from './core';
import { productSearchService, productAnalyticsService, productAggregationService } from './features';
import { productCacheService } from './utils';
import { productValidationService } from './validation';

// ============================================================================
// CORE SERVICES - Data and Account Management
// ============================================================================

export {
  // Product Data Service - CRUD operations
  ProductDataService,
  productDataService,

  // Product Account Service - Stats and ownership
  ProductAccountService,
  productAccountService
} from './core';

// ============================================================================
// FEATURE SERVICES - Business Logic & Operations
// ============================================================================

export {
  // Search Service - Full-text search and filtering
  ProductSearchService,
  productSearchService,

  // Analytics Service - Analytics and insights
  ProductAnalyticsService,
  productAnalyticsService,

  // Aggregation Service - Optimized aggregation queries
  ProductAggregationService,
  productAggregationService
} from './features';

// ============================================================================
// UTILITY SERVICES - Helper Functions
// ============================================================================

export {
  // Cache Service
  ProductCacheService,
  productCacheService,

  // Helper functions
  CacheKeys,
  buildCacheKey,
  isValidObjectId,
  validateString,
  extractOwner,
  getProductCacheTags,
  buildProductQuery,
  buildSortOptions,
  calculatePagination,
  formatProduct,
  validateOwner,
  getOwnerId,

  // Error class
  ProductError
} from './utils';

// ============================================================================
// VALIDATION SERVICES - Input and Business Rule Validation
// ============================================================================

export {
  // Product Validation Service
  ProductValidationService,
  productValidationService
} from './validation';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  CreateProductData,
  ProductFilters,
  ProductSearchParams,
  ProductListResult,
  ProductAnalyticsDateRange,
  ProductAnalyticsResult,
  ProductStatsOptions,
  ProductLeanDocument,
  ProductWithRelations,
  ManufacturerProductsWithStats,
  AggregationOptions,
  ProductCacheOptions,
  ProductOwner
} from './utils/types';

// ============================================================================
// CONVENIENCE EXPORTS - Organized Service Collections
// ============================================================================

/**
 * Organized collection of all product services
 * Use this for easy access to all services in one place
 *
 */
export const productsServices = {
  core: {
    data: productDataService,
    account: productAccountService
  },
  features: {
    search: productSearchService,
    analytics: productAnalyticsService,
    aggregation: productAggregationService
  },
  utils: {
    cache: productCacheService
  },
  validation: {
    productValidation: productValidationService
  }
};

/**
 * Get all product services
 * Alias for productsServices
 */
export const getProductsServices = () => productsServices;

/**
 * Legacy ProductService class for backward compatibility
 * Delegates to modular services
 */
export class ProductService {
  // Core data operations
  async createProduct(data: any, businessId?: string, manufacturerId?: string) {
    return productDataService.createProduct(data, businessId, manufacturerId);
  }

  async getProduct(productId: string, businessId?: string, manufacturerId?: string) {
    return productDataService.getProduct(productId, businessId, manufacturerId);
  }

  async getProducts(filters: any) {
    return productDataService.getProducts(filters);
  }

  async updateProduct(productId: string, updates: any, businessId?: string, manufacturerId?: string) {
    return productDataService.updateProduct(productId, updates, businessId, manufacturerId);
  }

  async deleteProduct(productId: string, businessId?: string, manufacturerId?: string) {
    return productDataService.deleteProduct(productId, businessId, manufacturerId);
  }

  // Account operations
  async getProductAnalytics(businessId?: string, manufacturerId?: string, dateRange?: any) {
    return productAccountService.getProductAnalytics({ businessId, manufacturerId, dateRange });
  }

  async validateMediaOwnership(mediaIds: string[], ownerId: string) {
    return productAccountService.validateMediaOwnership(mediaIds, ownerId);
  }

  // Search operations
  async searchProducts(searchParams: any) {
    return productSearchService.searchProducts(searchParams);
  }

  // Aggregation operations
  async getProductsWithAggregation(filters: any) {
    return productAggregationService.getProductsWithRelations(filters);
  }

  async getProductWithAggregation(productId: string, businessId?: string, manufacturerId?: string) {
    return productAggregationService.getProductWithRelations(productId, businessId, manufacturerId);
  }

  async getManufacturerProductsWithStats(manufacturerId: string) {
    return productAggregationService.getManufacturerProductsWithStats(manufacturerId);
  }
}

// Export singleton instance for backward compatibility
export const productService = new ProductService();

