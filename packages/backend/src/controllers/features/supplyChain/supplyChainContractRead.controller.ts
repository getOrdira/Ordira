// src/controllers/features/supplyChain/supplyChainContractRead.controller.ts
// Controller exposing read operations against supply chain contracts

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';

interface ContractReadRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
    endpointId?: string;
    eventId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
    endpointId?: string;
    eventId?: string;
    includeInactive?: boolean;
    limit?: number;
    page?: number;
    offset?: number;
  };
  validatedBody?: {
    businessId?: string;
    contractAddress?: string;
    productId?: string;
    endpointId?: string;
    eventId?: string;
  };
}

/**
 * SupplyChainContractReadController maps read queries to the contract read service.
 */
export class SupplyChainContractReadController extends SupplyChainBaseController {
  /**
   * Retrieve contract statistics.
   */
  async getContractStats(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_STATS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const result = await this.contractReadService.getContractStats(contractAddress, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_STATS_SUCCESS', {
        businessId,
        contractAddress,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain contract statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve endpoints for a contract.
   */
  async getContractEndpoints(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_ENDPOINTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const options = {
        includeInactive: this.parseOptionalBoolean(
          req.validatedQuery?.includeInactive ?? (req.query as any)?.includeInactive,
        ),
        limit: this.parseOptionalNumber(req.validatedQuery?.limit ?? (req.query as any)?.limit, {
          min: 1,
          max: 500,
        }),
        page: this.parseOptionalNumber(req.validatedQuery?.page ?? (req.query as any)?.page, {
          min: 1,
        }),
        offset: this.parseOptionalNumber(req.validatedQuery?.offset ?? (req.query as any)?.offset, {
          min: 0,
        }),
      };

      const result = await this.contractReadService.getEndpoints(contractAddress, businessId, options);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_ENDPOINTS_SUCCESS', {
        businessId,
        contractAddress,
        endpointCount: result.data?.length ?? 0,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain contract endpoints retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve products for a contract.
   */
  async getContractProducts(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_PRODUCTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const options = {
        includeInactive: this.parseOptionalBoolean(
          req.validatedQuery?.includeInactive ?? (req.query as any)?.includeInactive,
        ),
        limit: this.parseOptionalNumber(req.validatedQuery?.limit ?? (req.query as any)?.limit, {
          min: 1,
          max: 500,
        }),
        page: this.parseOptionalNumber(req.validatedQuery?.page ?? (req.query as any)?.page, {
          min: 1,
        }),
        offset: this.parseOptionalNumber(req.validatedQuery?.offset ?? (req.query as any)?.offset, {
          min: 0,
        }),
      };

      const result = await this.contractReadService.getProducts(contractAddress, businessId, options);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_PRODUCTS_SUCCESS', {
        businessId,
        contractAddress,
        productCount: result.data?.length ?? 0,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain contract products retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve events for a product.
   */
  async getProductEvents(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_EVENTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const productId = this.requireProductId(req);

      const options = {
        limit: this.parseOptionalNumber(req.validatedQuery?.limit ?? (req.query as any)?.limit, {
          min: 1,
          max: 500,
        }),
        page: this.parseOptionalNumber(req.validatedQuery?.page ?? (req.query as any)?.page, {
          min: 1,
        }),
        offset: this.parseOptionalNumber(req.validatedQuery?.offset ?? (req.query as any)?.offset, {
          min: 0,
        }),
      };

      const result = await this.contractReadService.getProductEvents(
        contractAddress,
        productId,
        businessId,
        options,
      );

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_EVENTS_SUCCESS', {
        businessId,
        contractAddress,
        productId,
        eventCount: result.data?.length ?? 0,
      });

      return {
        businessId,
        contractAddress,
        productId,
        result,
      };
    }, res, 'Supply chain product events retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a single endpoint by ID.
   */
  async getEndpointById(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_ENDPOINT_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const endpointIdRaw =
        req.validatedParams?.endpointId ??
        req.validatedQuery?.endpointId ??
        req.validatedBody?.endpointId ??
        (req.params as any)?.endpointId ??
        (req.query as any)?.endpointId;
      const endpointId = Number(endpointIdRaw);

      if (!Number.isFinite(endpointId)) {
        throw { statusCode: 400, message: 'Endpoint identifier must be numeric' };
      }

      const result = await this.contractReadService.getEndpoint(contractAddress, endpointId, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_ENDPOINT_GET_SUCCESS', {
        businessId,
        contractAddress,
        endpointId,
      });

      return {
        businessId,
        contractAddress,
        endpointId,
        result,
      };
    }, res, 'Supply chain endpoint retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a product by ID.
   */
  async getProductById(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_PRODUCT_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const productIdRaw =
        req.validatedParams?.productId ??
        req.validatedQuery?.productId ??
        req.validatedBody?.productId ??
        (req.params as any)?.productId ??
        (req.query as any)?.productId;
      const productId = Number(productIdRaw);

      if (!Number.isFinite(productId)) {
        throw { statusCode: 400, message: 'Product identifier must be numeric' };
      }

      const result = await this.contractReadService.getProduct(contractAddress, productId, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_PRODUCT_GET_SUCCESS', {
        businessId,
        contractAddress,
        productId,
      });

      return {
        businessId,
        contractAddress,
        productId,
        result,
      };
    }, res, 'Supply chain product retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve an event by ID.
   */
  async getEventById(req: ContractReadRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_EVENT_GET');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);

      const eventIdRaw =
        req.validatedParams?.eventId ??
        req.validatedQuery?.eventId ??
        req.validatedBody?.eventId ??
        (req.params as any)?.eventId ??
        (req.query as any)?.eventId;
      const eventId = Number(eventIdRaw);

      if (!Number.isFinite(eventId)) {
        throw { statusCode: 400, message: 'Event identifier must be numeric' };
      }

      const result = await this.contractReadService.getEvent(contractAddress, eventId, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_EVENT_GET_SUCCESS', {
        businessId,
        contractAddress,
        eventId,
      });

      return {
        businessId,
        contractAddress,
        eventId,
        result,
      };
    }, res, 'Supply chain event retrieved successfully', this.getRequestMeta(req));
  }
}

export const supplyChainContractReadController = new SupplyChainContractReadController();

