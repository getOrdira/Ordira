// src/lib/api/products.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

export interface Product {
  _id: string;
  business: string; // Types.ObjectId as string
  title: string;
  description?: string;
  media: string[]; // Array of media URLs or Media IDs
  status: 'draft' | 'proposed' | 'in_production' | 'manufactured'; // Assumed enums
  votes: number; // Total votes
  proposalEndDate?: Date; // For voting period
  quantityToProduce?: number; // Based on votes
  category?: string;
  tags?: string[];
  price?: number;
  specifications?: any;
  certificates?: string[];
  reviews?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Collection {
  _id: string;
  business: string; // Types.ObjectId as string
  title: string;
  description?: string;
  products: string[]; // Array of Product IDs
  slug?: string;
  isPublic: boolean;
  isActive: boolean;
  featuredImage?: string;
  tags: string[];
  sortOrder: number;
  metaDescription?: string;
  metaKeywords?: string[];
  viewCount: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Response interfaces matching backend structure (apiClient unwraps response.data)
export interface ProductListResponse {
  products: Product[];
  stats: {
    overview: any;
    filtered: {
      total: number;
      page: number;
      totalPages: number;
    };
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: any;
  retrievedAt: string;
}

export interface ProductDetailResponse {
  product: Product;
  relatedProducts?: Product[];
  analytics?: any;
  retrievedAt: string;
}

export interface FeaturedProductsResponse {
  featured: Product[];
  criteria: any;
  metadata: any;
}

export interface ProductSearchResponse {
  results: Product[];
  suggestions: string[];
  appliedFilters: any;
  searchMetadata: any;
}

export interface ProductCategoriesResponse {
  categories: string[];
  total: number;
}

/**
 * Fetches list of products with filtering and pagination.
 * @param params - Query parameters for filtering
 * @returns Promise<ProductListResponse>
 */
export const getProducts = async (params?: {
  business?: string;
  category?: string;
  status?: Product['status'];
  search?: string;
  hasMedia?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string;
  priceRange?: { min?: number; max?: number };
}): Promise<ProductListResponse> => {
  try {
    const response = await apiClient.get<ProductListResponse>('/api/products', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch products', 500);
  }
};

/**
 * Fetches a single product by ID with detailed information.
 * @param id - Product ID
 * @returns Promise<ProductDetailResponse>
 */
export const getProduct = async (id: string): Promise<ProductDetailResponse> => {
  try {
    const response = await apiClient.get<ProductDetailResponse>(`/api/products/${id}`);
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch product', 500);
  }
};

/**
 * Gets product media files.
 * @param id - Product ID
 * @returns Promise<any>
 */
export const getProductMedia = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/media`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product media', 500);
  }
};

/**
 * Gets product specifications.
 * @param id - Product ID
 * @returns Promise<any>
 */
export const getProductSpecifications = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/specifications`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product specifications', 500);
  }
};

/**
 * Gets certificates associated with product.
 * @param id - Product ID
 * @returns Promise<any>
 */
export const getProductCertificates = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/certificates`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product certificates', 500);
  }
};

/**
 * Gets voting information for product.
 * @param id - Product ID
 * @returns Promise<any>
 */
export const getProductVotes = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/votes`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product votes', 500);
  }
};

/**
 * Gets product reviews.
 * @param id - Product ID
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getProductReviews = async (id: string, params?: {
  page?: number;
  limit?: number;
  rating?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/reviews`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product reviews', 500);
  }
};

/**
 * Gets product analytics.
 * @param id - Product ID
 * @param params - Analytics parameters
 * @returns Promise<any>
 */
export const getProductAnalytics = async (id: string, params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/products/${id}/analytics`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product analytics', 500);
  }
};

/**
 * Creates a new product.
 * @param data - Product creation data
 * @returns Promise<ProductDetailResponse>
 */
export const createProduct = async (data: {
  title: string;
  description?: string;
  media?: string[];
  status?: Product['status'];
  proposalEndDate?: Date;
  category?: string;
  tags?: string[];
  price?: number;
  specifications?: any;
}): Promise<ProductDetailResponse> => {
  try {
    const response = await apiClient.post<ProductDetailResponse>('/api/products', data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to create product', 500);
  }
};

/**
 * Updates an existing product.
 * @param id - Product ID
 * @param data - Update data
 * @returns Promise<ProductDetailResponse>
 */
export const updateProduct = async (id: string, data: Partial<Product>): Promise<ProductDetailResponse> => {
  try {
    const response = await apiClient.patch<ProductDetailResponse>(`/api/products/${id}`, data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to update product', 500);
  }
};

/**
 * Deletes a product.
 * @param id - Product ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {deleted: boolean; productId: string}}>(`/api/products/${id}`);
    return { success: response.success };
  } catch (error) {
    throw new ApiError('Failed to delete product', 500);
  }
};

/**
 * Performs bulk operations on products.
 * @param productIds - Array of product IDs
 * @param updates - Updates to apply
 * @returns Promise<any>
 */
export const bulkUpdateProducts = async (
  productIds: string[],
  updates: {
    status?: Product['status'];
    category?: string;
    tags?: string[];
    price?: number;
  }
): Promise<any> => {
  try {
    const response = await apiClient.patch<{success: boolean; data: any}>('/api/products/bulk', {
      productIds,
      updates,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to perform bulk update on products', 500);
  }
};

// ===== PUBLIC PRODUCT DISCOVERY =====

/**
 * Gets featured products.
 * @param limit - Number of featured products to fetch
 * @returns Promise<FeaturedProductsResponse>
 */
export const getFeaturedProducts = async (limit?: number): Promise<FeaturedProductsResponse> => {
  try {
    const response = await apiClient.get<FeaturedProductsResponse>('/api/products/featured', {
      params: { limit },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch featured products', 500);
  }
};

/**
 * Searches products with advanced filtering.
 * @param searchData - Search criteria and filters
 * @returns Promise<ProductSearchResponse>
 */
export const searchProducts = async (searchData: {
  query?: string;
  category?: string;
  status?: Product['status'];
  tags?: string[];
  priceRange?: { min?: number; max?: number };
  location?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}): Promise<ProductSearchResponse> => {
  try {
    const response = await apiClient.post<ProductSearchResponse>('/api/products/search', searchData);
    return response;
  } catch (error) {
    throw new ApiError('Failed to search products', 500);
  }
};

/**
 * Gets available product categories.
 * @returns Promise<ProductCategoriesResponse>
 */
export const getProductCategories = async (): Promise<ProductCategoriesResponse> => {
  try {
    const response = await apiClient.get<ProductCategoriesResponse>('/api/products/categories');
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch product categories', 500);
  }
};

/**
 * Gets products by specific category.
 * @param category - Product category
 * @param params - Optional parameters
 * @returns Promise<ProductListResponse>
 */
export const getProductsByCategory = async (
  category: string,
  params?: { page?: number; limit?: number; sortBy?: string }
): Promise<ProductListResponse> => {
  try {
    const response = await apiClient.get<ProductListResponse>(`/api/products/category/${category}`, {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch products by category', 500);
  }
};

// ===== COLLECTION MANAGEMENT =====
// Note: Collections might be a separate API based on backend structure

/**
 * Fetches list of collections for the business.
 * @param isPublic - Optional filter for public collections
 * @returns Promise<Collection[]>
 */
export const getCollections = async (isPublic?: boolean): Promise<Collection[]> => {
  try {
    const response = await apiClient.get<{collections: Collection[]}>('/api/products/collections', {
      params: { isPublic },
    });
    return response.collections;
  } catch (error) {
    throw new ApiError('Failed to fetch collections', 500);
  }
};

/**
 * Fetches a single collection by ID or slug.
 * @param id - Collection ID or slug
 * @returns Promise<Collection>
 */
export const getCollection = async (id: string): Promise<Collection> => {
  try {
    const response = await apiClient.get<{collection: Collection}>(`/api/products/collections/${id}`);
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to fetch collection', 500);
  }
};

/**
 * Creates a new collection.
 * @param data - Collection creation data
 * @returns Promise<Collection>
 */
export const createCollection = async (data: {
  title: string;
  description?: string;
  products?: string[];
  isPublic?: boolean;
  featuredImage?: string;
  tags?: string[];
  sortOrder?: number;
  metaDescription?: string;
  metaKeywords?: string[];
}): Promise<Collection> => {
  try {
    const response = await apiClient.post<{collection: Collection}>('/api/products/collections', data);
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to create collection', 500);
  }
};

/**
 * Updates an existing collection.
 * @param id - Collection ID
 * @param data - Update data
 * @returns Promise<Collection>
 */
export const updateCollection = async (id: string, data: Partial<Collection>): Promise<Collection> => {
  try {
    const response = await apiClient.patch<{collection: Collection}>(`/api/products/collections/${id}`, data);
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to update collection', 500);
  }
};

/**
 * Deletes a collection.
 * @param id - Collection ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteCollection = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{deleted: boolean; collectionId: string}>(`/api/products/collections/${id}`);
    return { success: response.deleted };
  } catch (error) {
    throw new ApiError('Failed to delete collection', 500);
  }
};

/**
 * Adds a product to a collection.
 * @param collectionId - Collection ID
 * @param productId - Product ID to add
 * @returns Promise<Collection>
 */
export const addProductToCollection = async (collectionId: string, productId: string): Promise<Collection> => {
  try {
    const response = await apiClient.post<{collection: Collection}>(`/api/products/collections/${collectionId}/add-product`, { productId });
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to add product to collection', 500);
  }
};

/**
 * Removes a product from a collection.
 * @param collectionId - Collection ID
 * @param productId - Product ID to remove
 * @returns Promise<Collection>
 */
export const removeProductFromCollection = async (collectionId: string, productId: string): Promise<Collection> => {
  try {
    const response = await apiClient.post<{collection: Collection}>(`/api/products/collections/${collectionId}/remove-product`, { productId });
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to remove product from collection', 500);
  }
};

/**
 * Reorders products in a collection.
 * @param collectionId - Collection ID
 * @param productIds - New order of product IDs
 * @returns Promise<Collection>
 */
export const reorderProductsInCollection = async (collectionId: string, productIds: string[]): Promise<Collection> => {
  try {
    const response = await apiClient.patch<{collection: Collection}>(`/api/products/collections/${collectionId}/reorder-products`, { productIds });
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to reorder products in collection', 500);
  }
};

/**
 * Increments view count for a collection.
 * @param collectionId - Collection ID
 * @returns Promise<Collection>
 */
export const incrementCollectionViewCount = async (collectionId: string): Promise<Collection> => {
  try {
    const response = await apiClient.post<{collection: Collection}>(`/api/products/collections/${collectionId}/increment-view`);
    return response.collection;
  } catch (error) {
    throw new ApiError('Failed to increment collection view count', 500);
  }
};

/**
 * Fetches popular collections.
 * @param limit - Optional limit
 * @returns Promise<Collection[]>
 */
export const getPopularCollections = async (limit?: number): Promise<Collection[]> => {
  try {
    const response = await apiClient.get<{collections: Collection[]}>('/api/products/collections/popular', {
      params: { limit },
    });
    return response.collections;
  } catch (error) {
    throw new ApiError('Failed to fetch popular collections', 500);
  }
};

// Legacy function aliases for backward compatibility
export const searchProductsOrCollections = searchProducts;