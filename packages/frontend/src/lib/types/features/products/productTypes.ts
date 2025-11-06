/**
 * Product Types
 * 
 * Re-exports backend product types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
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
} from '@backend/services/products/utils/types';

// Re-export all backend types
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
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Product status - frontend-specific type
 */
export type ProductStatus = 'draft' | 'active' | 'archived' | 'pending' | 'rejected';

/**
 * Product category - frontend-specific type
 */
export type ProductCategory = 
  | 'electronics'
  | 'clothing'
  | 'food'
  | 'home'
  | 'sports'
  | 'beauty'
  | 'books'
  | 'toys'
  | 'automotive'
  | 'other';

/**
 * Product form data with frontend-specific fields
 * Extends backend CreateProductData with form-specific fields
 */
export interface ProductFormData extends Omit<CreateProductData, 'media'> {
  media?: File[] | string[]; // File objects for upload or existing media IDs
  images?: File[];
  videos?: File[];
  isDraft?: boolean;
  publishImmediately?: boolean;
}

/**
 * Product display type with enhanced UI fields
 */
export interface ProductDisplay extends ProductWithRelations {
  _ui?: {
    isFavorite?: boolean;
    isInCart?: boolean;
    viewCount?: number;
    lastViewed?: Date;
    rating?: number;
    reviewCount?: number;
  };
}

/**
 * Product list view options
 */
export interface ProductListViewOptions {
  viewMode?: 'grid' | 'list';
  sortBy?: 'price' | 'name' | 'date' | 'popularity' | 'rating';
  sortOrder?: 'asc' | 'desc';
  filters?: ProductFilters;
  page?: number;
  limit?: number;
}

