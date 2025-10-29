// src/controllers/features/supplyChain/supplyChainContractWrite.controller.ts
// Controller exposing write operations against supply chain contracts

import { Response } from 'express';
import { SupplyChainBaseController, SupplyChainBaseRequest } from './supplyChainBase.controller';
import type { IEndpointData, IProductData, IEventData } from '../../../services/supplyChain/utils/types';

interface ContractWriteRequest extends SupplyChainBaseRequest {
  validatedParams?: {
    businessId?: string;
    contractAddress?: string;
  };
  validatedBody?: any;
  validatedQuery?: {
    businessId?: string;
    contractAddress?: string;
  };
}

/**
 * SupplyChainContractWriteController maps write operations to the contract write service.
 */
export class SupplyChainContractWriteController extends SupplyChainBaseController {
  /**
   * Create an endpoint on the supply chain contract.
   */
  async createEndpoint(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_CREATE_ENDPOINT');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractEndpointData(req.validatedBody ?? req.body);

      const result = await this.contractWriteService.createEndpoint(contractAddress, payload, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_CREATE_ENDPOINT_SUCCESS', {
        businessId,
        contractAddress,
        endpointId: result.endpointId,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain endpoint created successfully', this.getRequestMeta(req));
  }

  /**
   * Register a product on the supply chain contract.
   */
  async registerProduct(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_REGISTER_PRODUCT');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractProductData(req.validatedBody ?? req.body);

      const result = await this.contractWriteService.registerProduct(contractAddress, payload, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_REGISTER_PRODUCT_SUCCESS', {
        businessId,
        contractAddress,
        productId: result.productId,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain product registered successfully', this.getRequestMeta(req));
  }

  /**
   * Log an event on the supply chain contract.
   */
  async logEvent(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_LOG_EVENT');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractEventData(req.validatedBody ?? req.body);

      const result = await this.contractWriteService.logEvent(contractAddress, payload, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_LOG_EVENT_SUCCESS', {
        businessId,
        contractAddress,
        eventId: result.eventId,
      });

      return {
        businessId,
        contractAddress,
        result,
      };
    }, res, 'Supply chain event logged successfully', this.getRequestMeta(req));
  }

  /**
   * Batch create endpoints.
   */
  async batchCreateEndpoints(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_CREATE_ENDPOINTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const raw = req.validatedBody ?? req.body;
      const endpoints = Array.isArray(raw?.endpoints) ? raw.endpoints : raw;

      const payloads = (endpoints as any[] ?? []).map((endpoint) => this.extractEndpointData(endpoint));

      const results = await this.contractWriteService.batchCreateEndpoints(
        contractAddress,
        payloads,
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_CREATE_ENDPOINTS_SUCCESS', {
        businessId,
        contractAddress,
        count: results.length,
      });

      return {
        businessId,
        contractAddress,
        results,
      };
    }, res, 'Supply chain endpoints batch created successfully', this.getRequestMeta(req));
  }

  /**
   * Batch register products.
   */
  async batchRegisterProducts(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_REGISTER_PRODUCTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const raw = req.validatedBody ?? req.body;
      const products = Array.isArray(raw?.products) ? raw.products : raw;

      const payloads = (products as any[] ?? []).map((product) => this.extractProductData(product));

      const results = await this.contractWriteService.batchRegisterProducts(
        contractAddress,
        payloads,
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_REGISTER_PRODUCTS_SUCCESS', {
        businessId,
        contractAddress,
        count: results.length,
      });

      return {
        businessId,
        contractAddress,
        results,
      };
    }, res, 'Supply chain products batch registered successfully', this.getRequestMeta(req));
  }

  /**
   * Batch log events.
   */
  async batchLogEvents(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_LOG_EVENTS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const raw = req.validatedBody ?? req.body;
      const events = Array.isArray(raw?.events) ? raw.events : raw;

      const payloads = (events as any[] ?? []).map((event) => this.extractEventData(event));

      const results = await this.contractWriteService.batchLogEvents(contractAddress, payloads, businessId);

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_BATCH_LOG_EVENTS_SUCCESS', {
        businessId,
        contractAddress,
        count: results.length,
      });

      return {
        businessId,
        contractAddress,
        results,
      };
    }, res, 'Supply chain events batch logged successfully', this.getRequestMeta(req));
  }

  /**
   * Estimate gas for endpoint creation.
   */
  async estimateCreateEndpointGas(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_ENDPOINT_GAS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractEndpointData(req.validatedBody ?? req.body);

      const gasEstimate = await this.contractWriteService.estimateCreateEndpointGas(
        contractAddress,
        payload,
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_ENDPOINT_GAS_SUCCESS', {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      });

      return {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      };
    }, res, 'Gas estimate for endpoint creation retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Estimate gas for product registration.
   */
  async estimateRegisterProductGas(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_PRODUCT_GAS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractProductData(req.validatedBody ?? req.body);

      const gasEstimate = await this.contractWriteService.estimateRegisterProductGas(
        contractAddress,
        payload,
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_PRODUCT_GAS_SUCCESS', {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      });

      return {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      };
    }, res, 'Gas estimate for product registration retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Estimate gas for logging an event.
   */
  async estimateLogEventGas(req: ContractWriteRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_EVENT_GAS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = this.requireContractAddress(req);
      const payload = this.extractEventData(req.validatedBody ?? req.body);

      const gasEstimate = await this.contractWriteService.estimateLogEventGas(
        contractAddress,
        payload,
        businessId,
      );

      this.logAction(req, 'SUPPLY_CHAIN_CONTRACT_ESTIMATE_EVENT_GAS_SUCCESS', {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      });

      return {
        businessId,
        contractAddress,
        gasEstimate: gasEstimate.toString(),
      };
    }, res, 'Gas estimate for event logging retrieved successfully', this.getRequestMeta(req));
  }

  private extractEndpointData(raw: any): IEndpointData {
    const payload = raw?.endpoint ?? raw;
    return {
      name: this.parseString(payload?.name) ?? '',
      eventType: this.parseString(payload?.eventType) as IEndpointData['eventType'],
      location: this.parseString(payload?.location) ?? '',
    };
  }

  private extractProductData(raw: any): IProductData {
    const payload = raw?.product ?? raw;
    return {
      productId: this.parseString(payload?.productId) ?? '',
      name: this.parseString(payload?.name) ?? '',
      description: this.parseString(payload?.description) ?? '',
    };
  }

  private extractEventData(raw: any): IEventData {
    const payload = raw?.event ?? raw;
    return {
      endpointId: Number(payload?.endpointId ?? payload?.endpoint_id ?? payload?.endpoint),
      productId: this.parseString(payload?.productId ?? payload?.product_id) ?? '',
      eventType: this.parseString(payload?.eventType ?? payload?.event_type) ?? '',
      location: this.parseString(payload?.location) ?? '',
      details: this.parseString(payload?.details) ?? '',
    };
  }
}

export const supplyChainContractWriteController = new SupplyChainContractWriteController();

