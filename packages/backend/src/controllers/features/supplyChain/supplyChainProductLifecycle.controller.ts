// src/controllers/features/supplyChain/supplyChainProductLifecycle.controller.ts
// Controller exposing product lifecycle workflows for supply chain contracts

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';
import type {
  IProductLifecycleRequest,
  IEventLoggingRequest,
  IBatchEventLoggingRequest,
} from '../../../services/supplyChain/features/productLifeCycle.service';
import type { SupplyChainEventType } from '../../../services/supplyChain/utils/types';

interface ProductLifecycleRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
  };
  validatedBody?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
    eventType?: SupplyChainEventType | string;
    location?: string;
    details?: string;
    endpointId?: number;
  };
}

/**
 * SupplyChainProductLifecycleController maps lifecycle workflows to the lifecycle service.
 */
export class SupplyChainProductLifecycleController extends SupplyChainBaseController {
  /**
   * Retrieve full product lifecycle details.
   */
  async getProductLifecycle(req: ProductLifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_LIFECYCLE_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const productId = this.requireProductId(req);

      const request: IProductLifecycleRequest = {
        businessId,
        contractAddress,
        productId,
      };

      const result = await this.productLifecycleService.getProductLifecycle(request);

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_LIFECYCLE_GET_SUCCESS', {
        businessId,
        contractAddress,
        productId,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        productId,
        result,
      };
    }, res, 'Product lifecycle retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Log a product event and refresh lifecycle information.
   */
  async logProductEvent(req: ProductLifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_EVENT_LOG');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const productId = this.requireProductId(req);
      const body = req.validatedBody ?? (req.body as any) ?? {};

      const request: IEventLoggingRequest = {
        businessId,
        contractAddress,
        productId,
        eventType: this.parseEventType(body.eventType),
        location: this.parseString(body.location) ?? '',
        details: this.parseString(body.details),
        endpointId: body.endpointId !== undefined ? Number(body.endpointId) : undefined,
      };

      const result = await this.productLifecycleService.logProductEvent(request);

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_EVENT_LOG_SUCCESS', {
        businessId,
        contractAddress,
        productId,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        productId,
        result,
      };
    }, res, 'Product event logged successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve product status overview.
   */
  async getProductStatus(req: ProductLifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_STATUS_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const productId = this.requireProductId(req);

      const request = {
        businessId,
        contractAddress,
        productId,
      };

      const result = await this.productLifecycleService.getProductStatus(request);

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_STATUS_GET_SUCCESS', {
        businessId,
        contractAddress,
        productId,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        productId,
        result,
      };
    }, res, 'Product status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Batch log product events and return summary.
   */
  async logBatchEvents(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_EVENTS_BATCH_LOG');

      const body = req.validatedBody ?? (req.body as any) ?? {};
      const businessId = this.parseString(body.businessId) ?? this.requireBusinessId(req);
      const contractAddress = this.parseString(body.contractAddress) ?? this.requireContractAddress(req);

      const eventsInput = Array.isArray(body.events) ? body.events : [];
      const events = eventsInput.map((event) => ({
        productId: this.parseString(event.productId) ?? '',
        eventType: this.parseEventType(event.eventType),
        location: this.parseString(event.location) ?? '',
        details: this.parseString(event.details),
        endpointId: event.endpointId !== undefined ? Number(event.endpointId) : undefined,
      }));

      const request: IBatchEventLoggingRequest = {
        businessId,
        contractAddress,
        events,
      };

      const result = await this.productLifecycleService.logBatchEvents(request);

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_EVENTS_BATCH_LOG_SUCCESS', {
        businessId,
        contractAddress,
        processed: result.data?.summary.totalProcessed,
        successful: result.data?.summary.successful,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Product events batch logged successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve lifecycle analytics for all products.
   */
  async getProductLifecycleAnalytics(req: SupplyChainBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_LIFECYCLE_ANALYTICS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const result = await this.productLifecycleService.getProductLifecycleAnalytics(
        businessId,
        contractAddress
      );

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_LIFECYCLE_ANALYTICS_SUCCESS', {
        businessId,
        contractAddress,
        success: result.success,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Product lifecycle analytics retrieved successfully', this.getRequestMeta(req));
  }

  private parseEventType(value: unknown): SupplyChainEventType {
    const eventType = this.parseString(value) as SupplyChainEventType | undefined;
    if (!eventType) {
      throw { statusCode: 400, message: 'Event type is required for lifecycle operation' };
    }
    return eventType;
  }
}

export const supplyChainProductLifecycleController = new SupplyChainProductLifecycleController();

