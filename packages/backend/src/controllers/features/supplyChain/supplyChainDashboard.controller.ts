// src/controllers/features/supplyChain/supplyChainDashboard.controller.ts
// Controller exposing dashboard operations for supply chain contracts

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';
import type { IAnalyticsRequest } from '../../../services/supplyChain/features/dashboard.service';

type Timeframe = 'day' | 'week' | 'month' | 'year';

interface DashboardRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
  };
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
    timeframe?: Timeframe | string;
    includeInactive?: boolean;
  };
  validatedBody?: {
    timeframe?: Timeframe | string;
    includeInactive?: boolean;
  };
}

/**
 * SupplyChainDashboardController maps dashboard queries to the dashboard service.
 */
export class SupplyChainDashboardController extends SupplyChainBaseController {
  /**
   * Retrieve comprehensive dashboard data.
   */
  async getDashboardData(req: DashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DASHBOARD_DATA');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const timeframe = this.parseTimeframe(query.timeframe ?? req.validatedBody?.timeframe);
      const includeInactive = this.parseOptionalBoolean(query.includeInactive ?? req.validatedBody?.includeInactive);

      const result = await this.dashboardService.getDashboardData({
        businessId,
        contractAddress,
        timeframe,
        includeInactive,
      });

      this.logAction(req, 'SUPPLY_CHAIN_DASHBOARD_DATA_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain dashboard data retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve dashboard overview metrics.
   */
  async getDashboardOverview(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DASHBOARD_OVERVIEW');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const result = await this.dashboardService.getDashboardOverview(businessId, contractAddress);

      this.logAction(req, 'SUPPLY_CHAIN_DASHBOARD_OVERVIEW_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain dashboard overview retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve product summaries for dashboard view.
   */
  async getProductSummaries(req: DashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DASHBOARD_PRODUCT_SUMMARIES');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const limit = this.parseOptionalNumber(query.limit, { min: 1, max: 100 });

      const result = await this.dashboardService.getProductSummaries(
        businessId,
        contractAddress,
        limit ?? 20
      );

      this.logAction(req, 'SUPPLY_CHAIN_DASHBOARD_PRODUCT_SUMMARIES_SUCCESS', {
        businessId,
        contractAddress,
        count: result.data?.length,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain product summaries retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve endpoint summaries for dashboard view.
   */
  async getEndpointSummaries(req: DashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DASHBOARD_ENDPOINT_SUMMARIES');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const result = await this.dashboardService.getEndpointSummaries(
        businessId,
        contractAddress
      );

      this.logAction(req, 'SUPPLY_CHAIN_DASHBOARD_ENDPOINT_SUMMARIES_SUCCESS', {
        businessId,
        contractAddress,
        count: result.data?.length,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain endpoint summaries retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve dashboard analytics dataset.
   */
  async getDashboardAnalytics(req: DashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_DASHBOARD_ANALYTICS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const groupByCandidate = this.parseString(query.groupBy) ??
        this.parseTimeframe(query.timeframe ?? req.validatedBody?.timeframe);
      const groupBy: IAnalyticsRequest['groupBy'] = 
        (groupByCandidate && ['day', 'week', 'month'].includes(groupByCandidate)) 
          ? groupByCandidate as IAnalyticsRequest['groupBy']
          : 'month';

      const result = await this.dashboardService.getAnalytics({
        businessId,
        contractAddress,
        groupBy,
      });

      this.logAction(req, 'SUPPLY_CHAIN_DASHBOARD_ANALYTICS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain dashboard analytics retrieved successfully', this.getRequestMeta(req));
  }

  private parseTimeframe(value: unknown): Timeframe | undefined {
    const timeframe = this.parseString(value) as Timeframe | undefined;
    if (!timeframe) {
      return undefined;
    }
    if (['day', 'week', 'month', 'year'].includes(timeframe)) {
      return timeframe;
    }
    return undefined;
  }
}

export const supplyChainDashboardController = new SupplyChainDashboardController();

