// src/lib/api/features/products/productsData.api.ts
// Product data API aligned with backend routes/features/products/productsData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  CreateProductData,
  ProductFilters,
  ProductListResult,
  ProductLeanDocument,
  ProductWithRelations
} from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalArray,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const createProductsDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'data',
  method,
  endpoint,
  ...context
});

export interface CreateProductInput extends CreateProductData {
  businessId?: string;
  manufacturerId?: string;
}

export interface UpdateProductInput extends Partial<CreateProductData> {
  businessId?: string;
  manufacturerId?: string;
}

export interface ProductListQuery extends ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ProductOwnerQuery {
  businessId?: string;
  manufacturerId?: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface ProductExistsQuery extends ProductOwnerQuery {
  productId: string;
}

const sanitizeTags = (tags?: string[]) =>
  sanitizeOptionalArray(
    tags,
    'tags',
    (value, index) =>
      sanitizeString(value, `tags[${index}]`, {
        maxLength: 50,
        trim: true
      }),
    { maxLength: 20 }
  );

const sanitizeMediaIds = (media?: string[]) =>
  sanitizeOptionalArray(
    media,
    'media',
    (value, index) => sanitizeObjectId(value, `media[${index}]`)
  );

const sanitizeSpecifications = (specifications?: Record<string, unknown>) => {
  if (!specifications) {
    return undefined;
  }

  const sanitizedObject = sanitizeOptionalJsonObject<Record<string, unknown>>(specifications, 'specifications');
  if (!sanitizedObject) {
    return undefined;
  }

  const sanitized: Record<string, string> = {};
  Object.entries(sanitizedObject).forEach(([key, value]) => {
    const sanitizedKey = sanitizeString(key, `specifications.${key}`, {
      minLength: 1,
      maxLength: 100,
      trim: true
    });

    if (value === undefined || value === null) {
      return;
    }

    sanitized[sanitizedKey] = sanitizeString(String(value), `specifications.${sanitizedKey}`, {
      maxLength: 500,
      trim: true,
      allowEmpty: false
    });
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const sanitizeManufacturingDetails = (
  details?: CreateProductData['manufacturingDetails']
) => {
  if (!details) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    materials: sanitizeOptionalArray(
      details.materials,
      'manufacturingDetails.materials',
      (value, index) =>
        sanitizeString(value, `manufacturingDetails.materials[${index}]`, {
          maxLength: 200,
          trim: true
        })
    ),
    dimensions: sanitizeOptionalString(details.dimensions, 'manufacturingDetails.dimensions', {
      maxLength: 200,
      trim: true
    }),
    weight: sanitizeOptionalString(details.weight, 'manufacturingDetails.weight', {
      maxLength: 200,
      trim: true
    }),
    origin: sanitizeOptionalString(details.origin, 'manufacturingDetails.origin', {
      maxLength: 200,
      trim: true
    })
  });
};

const sanitizeProductPayload = (
  payload: Partial<CreateProductData>,
  options: { requireTitle?: boolean } = {}
) => {
  const { requireTitle = false } = options;

  const title = requireTitle
    ? sanitizeString(payload.title, 'title', { minLength: 2, maxLength: 200, trim: true })
    : sanitizeOptionalString(payload.title, 'title', { minLength: 2, maxLength: 200, trim: true });

  const description = sanitizeOptionalString(payload.description, 'description', {
    maxLength: 2000,
    trim: true
  });

  const category = sanitizeOptionalString(payload.category, 'category', {
    maxLength: 100,
    trim: true
  });

  const status = sanitizeOptionalString(payload.status, 'status', {
    allowedValues: ['draft', 'active', 'archived'],
    toLowerCase: true,
    trim: true
  }) as CreateProductData['status'] | undefined;

  const sku = sanitizeOptionalString(payload.sku, 'sku', {
    maxLength: 100,
    trim: true
  });

  const price = sanitizeOptionalNumber(payload.price, 'price', { min: 0, max: 1_000_000_000 });

  const tags = sanitizeTags(payload.tags);
  const media = sanitizeMediaIds(payload.media);
  const specifications = sanitizeSpecifications(payload.specifications);
  const manufacturingDetails = sanitizeManufacturingDetails(payload.manufacturingDetails);

  return baseApi.sanitizeRequestData({
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(sku !== undefined ? { sku } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(media !== undefined ? { media } : {}),
    ...(specifications !== undefined ? { specifications } : {}),
    ...(manufacturingDetails !== undefined ? { manufacturingDetails } : {})
  });
};

const sanitizeOwnerIdentifiers = (params?: ProductOwnerQuery) => {
  if (!params) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId'),
    status: sanitizeOptionalString(params.status, 'status', {
      allowedValues: ['draft', 'active', 'archived'],
      toLowerCase: true,
      trim: true
    })
  });
};

const sanitizeListQuery = (filters?: ProductListQuery) => {
  if (!filters) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    page: sanitizeOptionalNumber(filters.page, 'page', { integer: true, min: 1 }),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 }),
    status: sanitizeOptionalString(filters.status, 'status', {
      allowedValues: ['draft', 'active', 'archived'],
      toLowerCase: true,
      trim: true
    }),
    category: sanitizeOptionalString(filters.category, 'category', { maxLength: 100, trim: true }),
    query: sanitizeOptionalString(filters.query, 'query', { maxLength: 500, trim: true }),
    search: sanitizeOptionalString(filters.search, 'search', { maxLength: 500, trim: true }),
    sortBy: sanitizeOptionalString(filters.sortBy, 'sortBy', { maxLength: 50, trim: true }),
    sortOrder: sanitizeOptionalString(filters.sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'],
      toLowerCase: true,
      trim: true
    }),
    priceMin: sanitizeOptionalNumber(filters.priceMin, 'priceMin', { min: 0 }),
    priceMax: sanitizeOptionalNumber(filters.priceMax, 'priceMax', { min: 0 }),
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId')
  });
};

export const productsDataApi = {
  /**
   * Create a new product.
   * POST /api/products
   */
  async createProduct(payload: CreateProductInput): Promise<ProductWithRelations> {
    const endpoint = BASE_PATH;

    const sanitizedPayload = {
      ...sanitizeProductPayload(payload, { requireTitle: true }),
      businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
      manufacturerId: sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId')
    };

    try {
      const response = await api.post<ApiResponse<{ product: ProductWithRelations }>>(
        endpoint,
        sanitizedPayload
      );
      const { product } = baseApi.handleResponse(
        response,
        'Failed to create product',
        400
      );
      return product;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('POST', endpoint, {
          hasOwnerContext: Boolean(sanitizedPayload.businessId || sanitizedPayload.manufacturerId)
        })
      );
    }
  },

  /**
   * Retrieve a product by identifier.
   * GET /api/products/:productId
   */
  async getProduct(productId: string, params?: ProductOwnerQuery): Promise<ProductWithRelations> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const query = sanitizeOwnerIdentifiers(params);
    const endpoint = `${BASE_PATH}/${sanitizedProductId}`;

    try {
      const response = await api.get<ApiResponse<{ product: ProductWithRelations }>>(endpoint, {
        params: query
      });
      const { product } = baseApi.handleResponse(
        response,
        'Failed to fetch product',
        500
      );
      return product;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('GET', `${BASE_PATH}/:productId`, {
          productId: sanitizedProductId,
          hasOwnerFilters: Boolean(query)
        })
      );
    }
  },

  /**
   * List products with filters and pagination.
   * GET /api/products
   */
  async listProducts(filters?: ProductListQuery): Promise<ProductListResult> {
    const endpoint = BASE_PATH;
    const params = sanitizeListQuery(filters);

    try {
      const response = await api.get<ApiResponse<ProductListResult>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch products',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  },

  /**
   * Update an existing product.
   * PUT /api/products/:productId
   */
  async updateProduct(
    productId: string,
    payload: UpdateProductInput
  ): Promise<ProductWithRelations> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const endpoint = `${BASE_PATH}/${sanitizedProductId}`;

    const sanitizedPayload = {
      ...sanitizeProductPayload(payload),
      businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
      manufacturerId: sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId')
    };

    try {
      const response = await api.put<ApiResponse<{ product: ProductWithRelations }>>(
        endpoint,
        sanitizedPayload
      );
      const { product } = baseApi.handleResponse(
        response,
        'Failed to update product',
        400
      );
      return product;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('PUT', `${BASE_PATH}/:productId`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Delete a product.
   * DELETE /api/products/:productId
   */
  async deleteProduct(productId: string, params?: ProductOwnerQuery): Promise<boolean> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const query = sanitizeOwnerIdentifiers(params);
    const endpoint = `${BASE_PATH}/${sanitizedProductId}`;

    try {
      const response = await api.delete<ApiResponse<{ deleted: boolean }>>(endpoint, {
        params: query
      });
      const { deleted } = baseApi.handleResponse(
        response,
        'Failed to delete product',
        400
      );
      return Boolean(deleted);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('DELETE', `${BASE_PATH}/:productId`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Retrieve products for the authenticated owner (non-paginated).
   * GET /api/products/owner/list
   */
  async listProductsByOwner(params?: ProductOwnerQuery): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/owner/list`;
    const query = sanitizeOwnerIdentifiers(params);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params: query
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch owner products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('GET', endpoint, { hasOwnerFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve product count for the authenticated owner.
   * GET /api/products/owner/count
   */
  async getProductCount(params?: ProductOwnerQuery): Promise<number> {
    const endpoint = `${BASE_PATH}/owner/count`;
    const query = sanitizeOwnerIdentifiers(params);

    try {
      const response = await api.get<ApiResponse<{ count: number }>>(endpoint, {
        params: query
      });
      const { count } = baseApi.handleResponse(
        response,
        'Failed to fetch product count',
        500
      );
      return count;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('GET', endpoint, { hasOwnerFilters: Boolean(query) })
      );
    }
  },

  /**
   * Determine if a product exists for an owner.
   * GET /api/products/exists
   */
  async productExists(params: ProductExistsQuery): Promise<boolean> {
    const query = baseApi.sanitizeQueryParams({
      productId: sanitizeObjectId(params.productId, 'productId'),
      businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
      manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId')
    });

    const endpoint = `${BASE_PATH}/exists`;

    try {
      const response = await api.get<ApiResponse<{ exists: boolean }>>(endpoint, {
        params: query
      });
      const { exists } = baseApi.handleResponse(
        response,
        'Failed to evaluate product existence',
        500
      );
      return Boolean(exists);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsDataLogContext('GET', endpoint, {
          productId: query.productId
        })
      );
    }
  }
};

export default productsDataApi;

