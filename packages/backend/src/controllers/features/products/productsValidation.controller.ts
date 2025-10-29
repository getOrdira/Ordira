// src/controllers/features/products/productsValidation.controller.ts
// Controller providing validation utilities for product workflows

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { CreateProductData } from '../../../services/products/utils';

interface ValidateCreateRequest extends ProductsBaseRequest {
  validatedBody: CreateProductData & {
    businessId?: string;
    manufacturerId?: string;
  };
}

interface ValidateUpdateRequest extends ProductsBaseRequest {
  validatedBody: Partial<CreateProductData>;
}

interface ValidateBulkRequest extends ProductsBaseRequest {
  validatedBody: {
    productIds: string[];
    maxBulkSize?: number;
  };
}

interface ValidatePriceQuery extends ProductsBaseRequest {
  validatedQuery?: {
    minPrice?: number;
    maxPrice?: number;
  };
}

interface ValidateSearchQueryRequest extends ProductsBaseRequest {
  validatedQuery?: {
    query?: string;
  };
}

interface SanitizeRequest extends ProductsBaseRequest {
  validatedBody: Partial<CreateProductData>;
}

/**
 * ProductsValidationController exposes validation helpers from the product validation service.
 */
export class ProductsValidationController extends ProductsBaseController {
  /**
   * Validate payload for product creation.
   */
  async validateCreateProduct(req: ValidateCreateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const owner = this.resolveOwner(req, { allowExplicit: true, fallbackToUser: false });

      const payload: CreateProductData = { ...req.validatedBody };
      delete (payload as any).businessId;
      delete (payload as any).manufacturerId;

      const sanitized = this.productServices.validation.sanitizeProductData(payload);
      const validation = await this.productServices.validation.validateCreateProduct(
        sanitized,
        owner.businessId,
        owner.manufacturerId,
      );

      return {
        valid: validation.valid,
        errors: validation.errors ?? [],
        sanitized,
      };
    }, res, 'Product creation payload validated', this.getRequestMeta(req));
  }

  /**
   * Validate payload for product updates.
   */
  async validateUpdateProduct(req: ValidateUpdateRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const sanitized = this.productServices.validation.sanitizeProductData(req.validatedBody);
      const validation = this.productServices.validation.validateUpdateProduct(sanitized);

      return {
        valid: validation.valid,
        errors: validation.errors ?? [],
        sanitized,
      };
    }, res, 'Product update payload validated', this.getRequestMeta(req));
  }

  /**
   * Validate bulk product operations.
   */
  async validateBulkOperation(req: ValidateBulkRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const validation = this.productServices.validation.validateBulkOperation(
        req.validatedBody.productIds,
        req.validatedBody.maxBulkSize ?? 100,
      );

      return {
        valid: validation.valid,
        errors: validation.errors ?? [],
      };
    }, res, 'Bulk product operation validated', this.getRequestMeta(req));
  }

  /**
   * Validate price range filters.
   */
  async validatePriceRange(req: ValidatePriceQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const validation = this.productServices.validation.validatePriceRange(
        req.validatedQuery?.minPrice,
        req.validatedQuery?.maxPrice,
      );

      return {
        valid: validation.valid,
        error: validation.error,
      };
    }, res, 'Product price range validated', this.getRequestMeta(req));
  }

  /**
   * Validate search query string.
   */
  async validateSearchQuery(req: ValidateSearchQueryRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const validation = this.productServices.validation.validateSearchQuery(req.validatedQuery?.query);

      return {
        valid: validation.valid,
        error: validation.error,
      };
    }, res, 'Product search query validated', this.getRequestMeta(req));
  }

  /**
   * Sanitize product payload (utility endpoint).
   */
  async sanitizeProductPayload(req: SanitizeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const sanitized = this.productServices.validation.sanitizeProductData(req.validatedBody);

      return { sanitized };
    }, res, 'Product payload sanitized', this.getRequestMeta(req));
  }
}

export const productsValidationController = new ProductsValidationController();
