// src/lib/api/features/products/productsValidation.api.ts
// Product validation API aligned with backend routes/features/products/productsValidation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { CreateProductData } from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalArray,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products/validation';

type HttpMethod = 'GET' | 'POST';

const createProductsValidationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'validation',
  method,
  endpoint,
  ...context
});

export interface ValidateCreateProductInput extends CreateProductData {
  businessId?: string;
  manufacturerId?: string;
}

export interface ValidateUpdateProductInput extends Partial<CreateProductData> {}

export interface ValidateBulkInput {
  productIds: string[];
  maxBulkSize?: number;
}

export interface ValidatePriceRangeQuery {
  minPrice?: number;
  maxPrice?: number;
}

export interface ValidateSearchQueryParams {
  query?: string;
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

export const productsValidationApi = {
  /**
   * Validate product creation payload.
   * POST /api/products/validation/validate-create
   */
  async validateCreateProduct(payload: ValidateCreateProductInput): Promise<{
    valid: boolean;
    errors: unknown[];
    sanitized: CreateProductData;
  }> {
    const endpoint = `${BASE_PATH}/validate-create`;

    const sanitizedPayload = {
      ...sanitizeProductPayload(payload, { requireTitle: true }),
      businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
      manufacturerId: sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId')
    };

    try {
      const response = await api.post<ApiResponse<{
        valid: boolean;
        errors: unknown[];
        sanitized: CreateProductData;
      }>>(endpoint, sanitizedPayload);

      return baseApi.handleResponse(
        response,
        'Failed to validate product creation payload',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('POST', endpoint, {
          hasOwnerContext: Boolean(sanitizedPayload.businessId || sanitizedPayload.manufacturerId)
        })
      );
    }
  },

  /**
   * Validate product update payload.
   * POST /api/products/validation/validate-update
   */
  async validateUpdateProduct(payload: ValidateUpdateProductInput): Promise<{
    valid: boolean;
    errors: unknown[];
    sanitized: Partial<CreateProductData>;
  }> {
    const endpoint = `${BASE_PATH}/validate-update`;
    const sanitizedPayload = sanitizeProductPayload(payload);

    try {
      const response = await api.post<ApiResponse<{
        valid: boolean;
        errors: unknown[];
        sanitized: Partial<CreateProductData>;
      }>>(endpoint, sanitizedPayload);

      return baseApi.handleResponse(
        response,
        'Failed to validate product update payload',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('POST', endpoint, {
          sanitizedKeys: Object.keys(sanitizedPayload ?? {})
        })
      );
    }
  },

  /**
   * Validate bulk product operations.
   * POST /api/products/validation/validate-bulk
   */
  async validateBulkOperation(payload: ValidateBulkInput): Promise<{
    valid: boolean;
    errors: unknown[];
  }> {
    const endpoint = `${BASE_PATH}/validate-bulk`;

    const sanitizedPayload = {
      productIds: sanitizeArray(
        payload.productIds,
        'productIds',
        (value, index) => sanitizeObjectId(value, `productIds[${index}]`),
        { minLength: 1, maxLength: 100 }
      ),
      maxBulkSize: sanitizeOptionalNumber(payload.maxBulkSize, 'maxBulkSize', {
        integer: true,
        min: 1,
        max: 500
      })
    };

    try {
      const response = await api.post<ApiResponse<{ valid: boolean; errors: unknown[] }>>(
        endpoint,
        sanitizedPayload
      );

      return baseApi.handleResponse(
        response,
        'Failed to validate bulk product payload',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('POST', endpoint, {
          productCount: sanitizedPayload.productIds.length
        })
      );
    }
  },

  /**
   * Validate product price range filters.
   * GET /api/products/validation/validate-price
   */
  async validatePriceRange(query?: ValidatePriceRangeQuery): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const endpoint = `${BASE_PATH}/validate-price`;
    const params = baseApi.sanitizeQueryParams({
      minPrice: sanitizeOptionalNumber(query?.minPrice, 'minPrice', { min: 0 }),
      maxPrice: sanitizeOptionalNumber(query?.maxPrice, 'maxPrice', { min: 0 })
    });

    try {
      const response = await api.get<ApiResponse<{ valid: boolean; error?: string }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to validate price range',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('GET', endpoint, {
          minPrice: params.minPrice,
          maxPrice: params.maxPrice
        })
      );
    }
  },

  /**
   * Validate product search query.
   * GET /api/products/validation/validate-search
   */
  async validateSearchQuery(query?: ValidateSearchQueryParams): Promise<{
    valid: boolean;
    error?: string;
  }> {
    const endpoint = `${BASE_PATH}/validate-search`;
    const params = baseApi.sanitizeQueryParams({
      query: sanitizeOptionalString(query?.query, 'query', { maxLength: 500, trim: true })
    });

    try {
      const response = await api.get<ApiResponse<{ valid: boolean; error?: string }>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to validate product search query',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('GET', endpoint, { hasQuery: Boolean(params.query) })
      );
    }
  },

  /**
   * Sanitize product payload using backend rules.
   * POST /api/products/validation/sanitize
   */
  async sanitizeProductPayload(payload: ValidateUpdateProductInput): Promise<{
    sanitized: Partial<CreateProductData>;
  }> {
    const endpoint = `${BASE_PATH}/sanitize`;
    const sanitizedPayload = sanitizeProductPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ sanitized: Partial<CreateProductData> }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to sanitize product payload',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsValidationLogContext('POST', endpoint, {
          sanitizedKeys: Object.keys(sanitizedPayload ?? {})
        })
      );
    }
  }
};

export default productsValidationApi;

