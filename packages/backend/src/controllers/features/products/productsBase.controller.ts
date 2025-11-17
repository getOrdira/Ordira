// src/controllers/features/products/productsBase.controller.ts
// Shared helpers for product feature controllers

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getProductsServices } from '../../../services/container.service';
import type {
  ProductFilters,
  ProductOwner,
} from '../../../services/products/utils';

interface OwnerResolutionOptions {
  allowExplicit?: boolean;
  fallbackToUser?: boolean;
}

interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Base controller exposing helpers shared across product feature controllers.
 */
export abstract class ProductsBaseController extends BaseController {
  protected productServices = getProductsServices();

  /**
   * Ensure request is authenticated and optionally matches the allowed roles.
   */
  protected ensureAuthenticated(
    req: BaseRequest,
    allowedTypes?: Array<'business' | 'manufacturer' | 'customer' | 'user'>,
  ): void {
    if (!req.userId || !req.userType) {
      throw { statusCode: 401, message: 'Authentication required' };
    }

    if (allowedTypes && !allowedTypes.includes(req.userType)) {
      throw { statusCode: 403, message: 'User type not permitted for this operation' };
    }
  }

  /**
   * Resolve owner identifiers from the request context.
   */
  protected resolveOwner(
    req: BaseRequest,
    options: OwnerResolutionOptions = {},
  ): ProductOwner {
    const { allowExplicit = false, fallbackToUser = true } = options;
    const owner: ProductOwner = {};

    if (allowExplicit) {
      const candidateSources = [
        req.validatedBody,
        req.validatedQuery,
        req.validatedParams,
      ];

      for (const source of candidateSources) {
        if (!source) continue;
        if (!owner.businessId && typeof source.businessId === 'string') {
          owner.businessId = source.businessId;
        }
        if (!owner.manufacturerId && typeof source.manufacturerId === 'string') {
          owner.manufacturerId = source.manufacturerId;
        }
      }
    }

    if (fallbackToUser) {
      if (!owner.businessId && req.businessId) {
        owner.businessId = req.businessId;
      }
      if (!owner.manufacturerId && req.manufacturerId) {
        owner.manufacturerId = req.manufacturerId;
      }
    }

    return owner;
  }

  /**
   * Ensure the resolved owner contains at least one identifier.
   */
  protected ensureOwner(owner: ProductOwner): void {
    if (!owner.businessId && !owner.manufacturerId) {
      throw {
        statusCode: 400,
        message: 'Either businessId or manufacturerId must be provided',
      };
    }
  }

  /**
   * Resolve product identifier from request params.
   */
  protected resolveProductId(req: BaseRequest): string {
    const productId =
      req.validatedParams?.productId ??
      req.validatedParams?.id ??
      (req.params?.productId as string) ??
      (req.params?.id as string);

    if (!productId) {
      throw { statusCode: 400, message: 'Product identifier is required' };
    }

    return productId;
  }

  /**
   * Parse pagination inputs with sane defaults.
   */
  protected parsePagination(
    source: Record<string, unknown> | undefined,
    defaultLimit: number = 20,
  ): PaginationResult {
    const page = this.parseNumber(source?.page, 1, { min: 1 });
    const limit = this.parseNumber(source?.limit, defaultLimit, { min: 1, max: 100 });

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  /**
   * Build common product listing filters from request query.
   */
  protected buildFilters(
    req: BaseRequest,
    owner: ProductOwner,
    pagination: PaginationResult,
  ): ProductFilters {
    const query = req.validatedQuery ?? {};

    const priceMin = this.parseOptionalNumber(query.priceMin, { min: 0 });
    const priceMax = this.parseOptionalNumber(query.priceMax, { min: 0 });

    return {
      businessId: owner.businessId,
      manufacturerId: owner.manufacturerId,
      category: this.parseString(query.category),
      status: this.parseString(query.status),
      query: this.parseString(query.query ?? query.search),
      priceMin,
      priceMax,
      limit: pagination.limit,
      offset: pagination.offset,
      sortBy: this.parseString(query.sortBy) ?? 'createdAt',
      sortOrder: this.parseString(query.sortOrder) === 'asc' ? 'asc' : 'desc',
    };
  }

  /**
   * Utility to parse numeric input with constraints.
   */
  protected parseNumber(
    value: unknown,
    fallback: number,
    options: { min?: number; max?: number } = {},
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    let result = parsed;
    if (options.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options.max !== undefined && result > options.max) {
      result = options.max;
    }

    return result;
  }

  /**
   * Parse optional numeric value.
   */
  protected parseOptionalNumber(
    value: unknown,
    options: { min?: number; max?: number } = {},
  ): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }
    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }
    return parsed;
  }

  /**
   * Parse string safely.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return undefined;
  }

  /**
   * Parse boolean input with fallback.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }

    return fallback;
  }
}

export type ProductsBaseRequest = BaseRequest;
