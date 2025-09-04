// src/lib/api/products.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

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

// Response interfaces matching backend structure
export interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
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
  };
}

export interface ProductDetailResponse {
  success: boolean;
  message: string;
  data: {
    product: Product;
    relatedProducts?: Product[];
    analytics?: any;
    retrievedAt: string;
  };
}

export interface FeaturedProductsResponse {
  success: boolean;
  message: string;
  data: {
    featured: Product[];
    criteria: any;
    metadata: any;
  };
}

export interface ProductSearchResponse {
  success: boolean;
  message: string;
  data: {
    results: Product[];
    suggestions: string[];
    appliedFilters: any;
    searchMetadata: any;
  };
}

export interface ProductCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    categories: string[];
    total: number;
  };
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch products', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product media', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product specifications', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product certificates', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product votes', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product reviews', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product analytics', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create product', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update product', error);
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
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete product', error);
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
    return response.data.data;
  } catch (error) {
    throw new ApiError('Failed to perform bulk update on products', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch featured products', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to search products', error);
  }
};

/**
 * Gets available product categories.
 * @returns Promise<ProductCategoriesResponse>
 */
export const getProductCategories = async (): Promise<ProductCategoriesResponse> => {
  try {
    const response = await apiClient.get<ProductCategoriesResponse>('/api/products/categories');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch product categories', error);
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
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch products by category', error);
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
    const response = await apiClient.get<{success: boolean; data: {collections: Collection[]}}>('/api/products/collections', {
      params: { isPublic },
    });
    return response.data.data.collections;
  } catch (error) {
    throw new ApiError('Failed to fetch collections', error);
  }
};

/**
 * Fetches a single collection by ID or slug.
 * @param id - Collection ID or slug
 * @returns Promise<Collection>
 */
export const getCollection = async (id: string): Promise<Collection> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${id}`);
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to fetch collection', error);
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
    const response = await apiClient.post<{success: boolean; data: {collection: Collection}}>('/api/products/collections', data);
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to create collection', error);
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
    const response = await apiClient.patch<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${id}`, data);
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to update collection', error);
  }
};

/**
 * Deletes a collection.
 * @param id - Collection ID
 * @returns Promise<{ success: boolean }>
 */
export const deleteCollection = async (id: string): Promise<{ success: boolean }> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: {deleted: boolean; collectionId: string}}>(`/api/products/collections/${id}`);
    return { success: response.data.success };
  } catch (error) {
    throw new ApiError('Failed to delete collection', error);
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
    const response = await apiClient.post<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${collectionId}/add-product`, { productId });
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to add product to collection', error);
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
    const response = await apiClient.post<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${collectionId}/remove-product`, { productId });
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to remove product from collection', error);
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
    const response = await apiClient.patch<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${collectionId}/reorder-products`, { productIds });
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to reorder products in collection', error);
  }
};

/**
 * Increments view count for a collection.
 * @param collectionId - Collection ID
 * @returns Promise<Collection>
 */
export const incrementCollectionViewCount = async (collectionId: string): Promise<Collection> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {collection: Collection}}>(`/api/products/collections/${collectionId}/increment-view`);
    return response.data.data.collection;
  } catch (error) {
    throw new ApiError('Failed to increment collection view count', error);
  }
};

/**
 * Fetches popular collections.
 * @param limit - Optional limit
 * @returns Promise<Collection[]>
 */
export const getPopularCollections = async (limit?: number): Promise<Collection[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {collections: Collection[]}}>('/api/products/collections/popular', {
      params: { limit },
    });
    return response.data.data.collections;
  } catch (error) {
    throw new ApiError('Failed to fetch popular collections', error);
  }
};

// Legacy function aliases for backward compatibility
export const searchProductsOrCollections = searchProducts;