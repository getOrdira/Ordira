// src/controllers/features/products/productsAccount.controller.ts
// Controller covering product account and ownership operations

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { ProductStatsOptions } from '../../../services/products/utils';

interface AnalyticsQuery extends ProductsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    start?: string;
    end?: string;
  };
}

interface OwnerQuery extends ProductsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    limit?: number;
    status?: 'draft' | 'active' | 'archived';
  };
}

interface BulkStatusRequest extends ProductsBaseRequest {
  validatedBody: {
    productIds: string[];
    status: 'draft' | 'active' | 'archived';
    businessId?: string;
    manufacturerId?: string;
  };
}

interface ProductActionParams extends ProductsBaseRequest {
  validatedParams: {
    productId: string;
  };
}

interface OwnershipQuery extends ProductsBaseRequest {
  validatedQuery?: {
    productId: string;
    businessId?: string;
    manufacturerId?: string;
  };
}

/**
 * ProductsAccountController exposes account-centric operations such as stats and ownership utilities.
 */
export class ProductsAccountController extends ProductsBaseController {
  /**
   * Retrieve product analytics summary for an owner.
   */
  async getProductAnalytics(req: AnalyticsQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const options: ProductStatsOptions = {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      };

      if (req.validatedQuery?.start && req.validatedQuery?.end) {
        const start = new Date(req.validatedQuery.start);
        const end = new Date(req.validatedQuery.end);
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
          options.dateRange = { start, end };
        }
      }

      this.recordPerformance(req, 'GET_PRODUCT_ANALYTICS');

      const analytics = await this.productServices.account.getProductAnalytics(options);

      this.logAction(req, 'GET_PRODUCT_ANALYTICS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { analytics };
    }, res, 'Product analytics retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve product categories for an owner.
   */
  async getProductCategories(req: OwnerQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'GET_PRODUCT_CATEGORIES');

      const categories = await this.productServices.account.getProductCategories(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'GET_PRODUCT_CATEGORIES_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: categories.length,
      });

      return { categories };
    }, res, 'Product categories retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve product statistics summary.
   */
  async getProductStats(req: OwnerQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'GET_PRODUCT_STATS');

      const stats = await this.productServices.account.getProductStats(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'GET_PRODUCT_STATS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { stats };
    }, res, 'Product stats retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent products for an owner.
   */
  async getRecentProducts(req: OwnerQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_RECENT_PRODUCTS');

      const products = await this.productServices.account.getRecentProducts(
        owner.businessId,
        owner.manufacturerId,
        limit,
      );

      this.logAction(req, 'GET_RECENT_PRODUCTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Recent products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve popular products (by views).
   */
  async getPopularProducts(req: OwnerQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_POPULAR_PRODUCTS');

      const products = await this.productServices.account.getPopularProducts(
        owner.businessId,
        owner.manufacturerId,
        limit,
      );

      this.logAction(req, 'GET_POPULAR_PRODUCTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Popular products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve top voted products.
   */
  async getTopVotedProducts(req: OwnerQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_TOP_VOTED_PRODUCTS');

      const products = await this.productServices.account.getTopVotedProducts(
        owner.businessId,
        owner.manufacturerId,
        limit,
      );

      this.logAction(req, 'GET_TOP_VOTED_PRODUCTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Top voted products retrieved', this.getRequestMeta(req));
  }

  /**
   * Increment product view count.
   */
  async incrementViewCount(req: ProductActionParams, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);

      this.recordPerformance(req, 'INCREMENT_PRODUCT_VIEW');
      await this.productServices.account.incrementViewCount(productId);

      this.logAction(req, 'INCREMENT_PRODUCT_VIEW_SUCCESS', { productId });

      return { updated: true };
    }, res, 'Product view count incremented', this.getRequestMeta(req));
  }

  /**
   * Increment product vote count.
   */
  async incrementVoteCount(req: ProductActionParams, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);

      this.recordPerformance(req, 'INCREMENT_PRODUCT_VOTE');
      await this.productServices.account.incrementVoteCount(productId);

      this.logAction(req, 'INCREMENT_PRODUCT_VOTE_SUCCESS', { productId });

      return { updated: true };
    }, res, 'Product vote count incremented', this.getRequestMeta(req));
  }

  /**
   * Increment product certificate count.
   */
  async incrementCertificateCount(req: ProductActionParams, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);

      this.recordPerformance(req, 'INCREMENT_PRODUCT_CERTIFICATE');
      await this.productServices.account.incrementCertificateCount(productId);

      this.logAction(req, 'INCREMENT_PRODUCT_CERTIFICATE_SUCCESS', { productId });

      return { updated: true };
    }, res, 'Product certificate count incremented', this.getRequestMeta(req));
  }

  /**
   * Check if the user is the owner of a product.
   */
  async isProductOwner(req: OwnershipQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId =
        req.validatedQuery?.productId ??
        (req.query?.productId as string);
      if (!productId) {
        throw { statusCode: 400, message: 'productId query parameter is required' };
      }

      const owner = this.resolveOwner(req, { allowExplicit: true });

      this.recordPerformance(req, 'PRODUCT_OWNERSHIP_CHECK');

      const owns = await this.productServices.account.isProductOwner(
        productId,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'PRODUCT_OWNERSHIP_CHECK_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        owns,
      });

      return { owns };
    }, res, 'Product ownership evaluated', this.getRequestMeta(req));
  }

  /**
   * Bulk update product statuses for an owner.
   */
  async bulkUpdateStatus(req: BulkStatusRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req, ['business', 'manufacturer']);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const validation = this.productServices.validation.validateBulkOperation(req.validatedBody.productIds);
      if (!validation.valid) {
        throw {
          statusCode: 400,
          message: 'Invalid bulk operation payload',
          details: validation.errors,
        };
      }

      this.recordPerformance(req, 'BULK_UPDATE_PRODUCT_STATUS');

      const result = await this.productServices.account.bulkUpdateStatus(
        req.validatedBody.productIds,
        req.validatedBody.status,
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'BULK_UPDATE_PRODUCT_STATUS_SUCCESS', {
        updated: result.updated,
        status: req.validatedBody.status,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { updated: result.updated };
    }, res, 'Product statuses updated', this.getRequestMeta(req));
  }
}

export const productsAccountController = new ProductsAccountController();
