// src/controllers/features/supplyChain/supplyChainAnalytics.controller.ts
// Controller exposing analytics operations for supply chain contracts

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';

type GroupBy = 'day' | 'week' | 'month' | 'year';

interface AnalyticsRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
  };
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: GroupBy | string;
    includeInactive?: boolean;
  };
  validatedBody?: {
    startDate?: string;
    endDate?: string;
  };
}

/**
 * SupplyChainAnalyticsController maps analytics requests to the analytics service.
 */
export class SupplyChainAnalyticsController extends SupplyChainBaseController {
  /**
   * Retrieve comprehensive analytics for a supply chain contract.
   */
  async getAnalytics(req: AnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const startDate = this.parseDate(query.startDate ?? req.validatedBody?.startDate);
      const endDate = this.parseDate(query.endDate ?? req.validatedBody?.endDate);
      const groupBy = this.parseGroupBy(query.groupBy);
      const includeInactive = this.parseOptionalBoolean(query.includeInactive);

      const result = await this.analyticsService.getAnalytics({
        businessId,
        contractAddress,
        startDate,
        endDate,
        groupBy,
        includeInactive,
      });

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_GET_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain analytics generated successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve event analytics for a contract.
   */
  async getEventAnalytics(req: AnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_EVENTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const startDate = this.parseDate(query.startDate);
      const endDate = this.parseDate(query.endDate);

      const result = await this.analyticsService.getEventAnalytics(
        businessId,
        contractAddress,
        startDate,
        endDate,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_EVENTS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain event analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve product analytics for a contract.
   */
  async getProductAnalytics(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_PRODUCTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const result = await this.analyticsService.getProductAnalytics(businessId, contractAddress);

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_PRODUCTS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain product analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve endpoint analytics for a contract.
   */
  async getEndpointAnalytics(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_ENDPOINTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const result = await this.analyticsService.getEndpointAnalytics(businessId, contractAddress);

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_ENDPOINTS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain endpoint analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve performance metrics for a contract.
   */
  async getPerformanceMetrics(req: AnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_PERFORMANCE');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const startDate = this.parseDate(query.startDate);
      const endDate = this.parseDate(query.endDate);

      const result = await this.analyticsService.getPerformanceMetrics(
        businessId,
        contractAddress,
        startDate,
        endDate,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_PERFORMANCE_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain performance metrics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve trend analysis for a contract.
   */
  async getTrendAnalysis(req: AnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ANALYTICS_TRENDS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const startDate = this.parseDate(query.startDate);
      const endDate = this.parseDate(query.endDate);

      const result = await this.analyticsService.getTrendAnalysis(
        businessId,
        contractAddress,
        startDate,
        endDate,
      );

      this.logAction(req, 'SUPPLY_CHAIN_ANALYTICS_TRENDS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain trend analysis retrieved successfully', this.getRequestMeta(req));
  }

  private parseGroupBy(value: unknown): GroupBy | undefined {
    const groupBy = this.parseString(value) as GroupBy | undefined;
    if (!groupBy) {
      return undefined;
    }
    if (['day', 'week', 'month', 'year'].includes(groupBy)) {
      return groupBy;
    }
    return undefined;
  }
}

export const supplyChainAnalyticsController = new SupplyChainAnalyticsController();

