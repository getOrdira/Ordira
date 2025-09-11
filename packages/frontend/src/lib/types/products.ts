// src/lib/types/products.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Product status types
 * Based on backend IProduct model status field
 */
export type ProductStatus = 'draft' | 'active' | 'archived';

/**
 * Product category types
 * Common product categories
 */
export type ProductCategory = 
  | 'electronics' 
  | 'clothing' 
  | 'home' 
  | 'automotive' 
  | 'beauty' 
  | 'sports' 
  | 'books' 
  | 'toys' 
  | 'food' 
  | 'health' 
  | 'other';

/**
 * Manufacturing details interface
 * Based on backend IProduct model manufacturingDetails field
 */
export interface ManufacturingDetails {
  materials?: string[];
  dimensions?: string;
  weight?: string;
  origin?: string;
  productionTime?: string;
  qualityStandards?: string[];
  certifications?: string[];
}

/**
 * Supply chain QR code interface
 * Based on backend IProduct model supplyChainQrCode field
 */
export interface SupplyChainQrCode {
  qrCodeUrl: string;
  qrCodeData: string;
  generatedAt: Date;
  isActive: boolean;
}

/**
 * Product specification interface
 * Based on backend IProduct model specifications field
 */
export interface ProductSpecification {
  [key: string]: string;
}

/**
 * Product interface
 * Based on backend IProduct model
 */
export interface Product {
  _id: string;
  
  // Core product information
  title: string;
  description?: string;
  media: string[]; // Media ID references
  
  // Owner - either business OR manufacturer (mutually exclusive)
  business?: string; // Business ID reference
  manufacturer?: string; // Manufacturer ID reference
  
  // Product details
  category?: ProductCategory;
  status: ProductStatus;
  sku?: string;
  price?: number;
  tags: string[];
  
  // Enhanced product specifications
  specifications: ProductSpecification;
  manufacturingDetails?: ManufacturingDetails;
  
  // Analytics and engagement
  voteCount: number;
  certificateCount: number;
  viewCount: number;
  lastViewedAt?: Date;
  engagementScore?: number;
  
  // SEO and metadata
  slug?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  
  // Supply chain tracking
  supplyChainQrCode?: SupplyChainQrCode;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection interface
 * Based on backend ICollection model
 */
export interface Collection {
  _id: string;
  business: string; // Business ID reference
  name: string;
  description?: string;
  products: string[]; // Product ID references
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product creation request
 * For creating new products
 */
export interface CreateProductRequest {
  title: string;
  description?: string;
  media?: string[];
  category?: ProductCategory;
  sku?: string;
  price?: number;
  tags?: string[];
  specifications?: ProductSpecification;
  manufacturingDetails?: ManufacturingDetails;
  metaDescription?: string;
  metaKeywords?: string[];
}

/**
 * Product update request
 * For updating existing products
 */
export interface UpdateProductRequest {
  title?: string;
  description?: string;
  media?: string[];
  category?: ProductCategory;
  status?: ProductStatus;
  sku?: string;
  price?: number;
  tags?: string[];
  specifications?: ProductSpecification;
  manufacturingDetails?: ManufacturingDetails;
  metaDescription?: string;
  metaKeywords?: string[];
}

/**
 * Product list response
 * For paginated product lists
 */
export interface ProductListResponse extends PaginatedResponse<Product> {
  products: Product[];
  analytics: {
    totalProducts: number;
    activeProducts: number;
    draftProducts: number;
    archivedProducts: number;
    totalViews: number;
    totalVotes: number;
    totalCertificates: number;
  };
}

/**
 * Product detail response
 * For detailed product information
 */
export interface ProductDetailResponse {
  product: Product;
  media: Array<{
    _id: string;
    url: string;
    type: string;
    alt?: string;
  }>;
  business?: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  manufacturer?: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  analytics: {
    viewCount: number;
    voteCount: number;
    certificateCount: number;
    engagementScore: number;
    lastViewedAt?: Date;
  };
  relatedProducts: Product[];
}

/**
 * Product search response
 * For product search results
 */
export interface ProductSearchResponse extends PaginatedResponse<Product> {
  products: Product[];
  filters: {
    categories: Array<{
      category: ProductCategory;
      count: number;
    }>;
    priceRange: {
      min: number;
      max: number;
    };
    tags: Array<{
      tag: string;
      count: number;
    }>;
  };
  searchMetadata: {
    query: string;
    totalResults: number;
    searchTime: number;
    suggestions?: string[];
  };
}

/**
 * Featured products response
 * For featured product collections
 */
export interface FeaturedProductsResponse {
  featured: Product[];
  trending: Product[];
  new: Product[];
  topRated: Product[];
  categories: Array<{
    category: ProductCategory;
    products: Product[];
  }>;
}

/**
 * Product categories response
 * For product category listings
 */
export interface ProductCategoriesResponse {
  categories: Array<{
    category: ProductCategory;
    name: string;
    description?: string;
    productCount: number;
    imageUrl?: string;
  }>;
  totalCategories: number;
}

/**
 * Product analytics response
 * For product analytics and reporting
 */
export interface ProductAnalyticsResponse {
  overview: {
    totalProducts: number;
    activeProducts: number;
    totalViews: number;
    totalVotes: number;
    totalCertificates: number;
    averageEngagementScore: number;
  };
  categoryDistribution: Array<{
    category: ProductCategory;
    count: number;
    percentage: number;
  }>;
  statusDistribution: Array<{
    status: ProductStatus;
    count: number;
    percentage: number;
  }>;
  topProducts: Array<{
    product: Product;
    metrics: {
      views: number;
      votes: number;
      certificates: number;
      engagementScore: number;
    };
  }>;
  monthlyStats: Array<{
    month: string;
    productsCreated: number;
    views: number;
    votes: number;
    certificates: number;
  }>;
}

/**
 * Collection creation request
 * For creating new collections
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  products?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * Collection update request
 * For updating existing collections
 */
export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  products?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * Collection list response
 * For paginated collection lists
 */
export interface CollectionListResponse extends PaginatedResponse<Collection> {
  collections: Collection[];
  analytics: {
    totalCollections: number;
    activeCollections: number;
    totalProducts: number;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Product status validation schema
 */
export const productStatusSchema = Joi.string()
  .valid('draft', 'active', 'archived')
  .required()
  .messages({
    'any.only': 'Status must be one of: draft, active, archived'
  });

/**
 * Product category validation schema
 */
export const productCategorySchema = Joi.string()
  .valid('electronics', 'clothing', 'home', 'automotive', 'beauty', 'sports', 'books', 'toys', 'food', 'health', 'other')
  .optional()
  .messages({
    'any.only': 'Category must be one of: electronics, clothing, home, automotive, beauty, sports, books, toys, food, health, other'
  });

/**
 * Manufacturing details validation schema
 */
export const manufacturingDetailsSchema = Joi.object({
  materials: Joi.array().items(Joi.string()).optional(),
  dimensions: Joi.string().optional(),
  weight: Joi.string().optional(),
  origin: Joi.string().optional(),
  productionTime: Joi.string().optional(),
  qualityStandards: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.string()).optional()
});

/**
 * Supply chain QR code validation schema
 */
export const supplyChainQrCodeSchema = Joi.object({
  qrCodeUrl: commonSchemas.url.required(),
  qrCodeData: Joi.string().required(),
  generatedAt: Joi.date().required(),
  isActive: Joi.boolean().default(true)
});

/**
 * Product specification validation schema
 */
export const productSpecificationSchema = Joi.object().pattern(
  Joi.string(),
  Joi.string()
);

/**
 * Create product request validation schema
 */
export const createProductRequestSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(2000).optional(),
  media: Joi.array().items(commonSchemas.mongoId).optional(),
  category: productCategorySchema,
  sku: Joi.string().max(100).optional(),
  price: Joi.number().min(0).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  specifications: productSpecificationSchema.optional(),
  manufacturingDetails: manufacturingDetailsSchema.optional(),
  metaDescription: Joi.string().max(160).optional(),
  metaKeywords: Joi.array().items(Joi.string().max(50)).optional()
});

/**
 * Update product request validation schema
 */
export const updateProductRequestSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(2000).optional(),
  media: Joi.array().items(commonSchemas.mongoId).optional(),
  category: productCategorySchema,
  status: productStatusSchema.optional(),
  sku: Joi.string().max(100).optional(),
  price: Joi.number().min(0).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  specifications: productSpecificationSchema.optional(),
  manufacturingDetails: manufacturingDetailsSchema.optional(),
  metaDescription: Joi.string().max(160).optional(),
  metaKeywords: Joi.array().items(Joi.string().max(50)).optional()
});

/**
 * Product query validation schema
 */
export const productQuerySchema = Joi.object({
  status: productStatusSchema.optional(),
  category: productCategorySchema,
  business: commonSchemas.mongoId.optional(),
  manufacturer: commonSchemas.mongoId.optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('title', 'createdAt', 'updatedAt', 'viewCount', 'voteCount', 'price').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Collection creation request validation schema
 */
export const createCollectionRequestSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  products: Joi.array().items(commonSchemas.mongoId).optional(),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().min(0).default(0)
});

/**
 * Collection update request validation schema
 */
export const updateCollectionRequestSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  products: Joi.array().items(commonSchemas.mongoId).optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().min(0).optional()
});

/**
 * Export all product validation schemas
 */
export const productValidationSchemas = {
  productStatus: productStatusSchema,
  productCategory: productCategorySchema,
  manufacturingDetails: manufacturingDetailsSchema,
  supplyChainQrCode: supplyChainQrCodeSchema,
  productSpecification: productSpecificationSchema,
  createProductRequest: createProductRequestSchema,
  updateProductRequest: updateProductRequestSchema,
  productQuery: productQuerySchema,
  createCollectionRequest: createCollectionRequestSchema,
  updateCollectionRequest: updateCollectionRequestSchema
};
