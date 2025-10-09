import { Types, Document } from 'mongoose';
import { IProduct } from '../../../models/product.model';

/**
 * Product-related type definitions
 */

// Product creation input
export interface CreateProductData {
  title: string;
  description?: string;
  media?: string[]; // Media IDs
  category?: string;
  status?: 'draft' | 'active' | 'archived';
  sku?: string;
  price?: number;
  tags?: string[];
  specifications?: Record<string, string>;
  manufacturingDetails?: {
    materials?: string[];
    dimensions?: string;
    weight?: string;
    origin?: string;
  };
}

// Product listing filters
export interface ProductFilters {
  query?: string;
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Product search parameters
export interface ProductSearchParams {
  query: string;
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  limit?: number;
}

// Product listing result
export interface ProductListResult {
  products: any[];
  total?: number;
  hasMore: boolean;
  queryTime: number;
  pagination?: any;
  optimizationType?: string;
  cached?: boolean;
}

// Product analytics date range
export interface ProductAnalyticsDateRange {
  start: Date;
  end: Date;
}

// Product analytics result
export interface ProductAnalyticsResult {
  totalProducts: number;
  totalVotes: number;
  totalCertificates: number;
  totalViews: number;
  avgVotes: number;
  avgViews: number;
  categories: string[];
  avgPrice: number;
}

// Product stats by owner
export interface ProductStatsOptions {
  businessId?: string;
  manufacturerId?: string;
  dateRange?: ProductAnalyticsDateRange;
}

// Lean product document (optimized for read operations)
export type ProductLeanDocument = IProduct & { _id: Types.ObjectId };

// Product with aggregated relations
export interface ProductWithRelations extends ProductLeanDocument {
  mediaDetails?: any[];
  ownerDetails?: any;
  certificateDetails?: any[];
  voteDetails?: any[];
}

// Manufacturer products with stats
export interface ManufacturerProductsWithStats {
  manufacturer: {
    _id: string;
    name: string;
    industry?: string;
    isVerified?: boolean;
    profileScore?: number;
  };
  products: any[];
  stats: {
    totalProducts: number;
    totalVotes: number;
    totalCertificates: number;
    avgPrice: number;
  };
  executionTime: number;
  cached: boolean;
}

// Aggregation options
export interface AggregationOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  cache?: boolean;
  cacheTTL?: number;
}

// Product cache options
export interface ProductCacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

// Owner identification
export interface ProductOwner {
  businessId?: string;
  manufacturerId?: string;
}

