// src/controllers/features/products/productsAnalytics.controller.ts
// Controller exposing advanced product analytics operations

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { ProductStatsOptions } from '../../../services/products/utils';

interface AnalyticsRequest extends ProductsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    start?: string;
    end?: string;
  };
}

interface OwnerScopedQuery extends ProductsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
    days?: number;
    limit?: number;
    months?: number;
  };
}

/**
 * ProductsAnalyticsController wraps the product analytics feature service.
 */
export class ProductsAnalyticsController extends ProductsBaseController {
  /**
   * Retrieve comprehensive analytics summary.
   */
  async getAnalyticsSummary(req: AnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
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

      this.recordPerformance(req, 'GET_PRODUCT_ANALYTICS_SUMMARY');

      const analytics = await this.productServices.analytics.getAnalytics(options);

      this.logAction(req, 'GET_PRODUCT_ANALYTICS_SUMMARY_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { analytics };
    }, res, 'Product analytics summary retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve category analytics for an owner.
   */
  async getCategoryAnalytics(req: OwnerScopedQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'GET_PRODUCT_CATEGORY_ANALYTICS');

      const categories = await this.productServices.analytics.getCategoryAnalytics(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'GET_PRODUCT_CATEGORY_ANALYTICS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: categories.length,
      });

      return { categories };
    }, res, 'Product category analytics retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve engagement metrics for an owner.
   */
  async getEngagementMetrics(req: OwnerScopedQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'GET_PRODUCT_ENGAGEMENT_METRICS');

      const metrics = await this.productServices.analytics.getEngagementMetrics(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'GET_PRODUCT_ENGAGEMENT_METRICS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { metrics };
    }, res, 'Product engagement metrics retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve trending products for an owner.
   */
  async getTrendingProducts(req: OwnerScopedQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const days = this.parseNumber(req.validatedQuery?.days, 7, { min: 1, max: 90 });
      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_TRENDING_PRODUCTS');

      const products = await this.productServices.analytics.getTrendingProducts(
        owner.businessId,
        owner.manufacturerId,
        days,
        limit,
      );

      this.logAction(req, 'GET_TRENDING_PRODUCTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
        days,
      });

      return { products };
    }, res, 'Trending products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve performance insights for an owner.
   */
  async getPerformanceInsights(req: OwnerScopedQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'GET_PRODUCT_PERFORMANCE_INSIGHTS');

      const insights = await this.productServices.analytics.getPerformanceInsights(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'GET_PRODUCT_PERFORMANCE_INSIGHTS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { insights };
    }, res, 'Product performance insights retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve monthly trends for an owner.
   */
  async getMonthlyTrends(req: OwnerScopedQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      const months = this.parseNumber(req.validatedQuery?.months, 6, { min: 1, max: 24 });

      this.recordPerformance(req, 'GET_PRODUCT_MONTHLY_TRENDS');

      const trends = await this.productServices.analytics.getMonthlyTrends(
        owner.businessId,
        owner.manufacturerId,
        months,
      );

      this.logAction(req, 'GET_PRODUCT_MONTHLY_TRENDS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        months,
      });

      return { trends };
    }, res, 'Product monthly trends retrieved', this.getRequestMeta(req));
  }
}

export const productsAnalyticsController = new ProductsAnalyticsController();
