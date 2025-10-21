// src/services/blockchain/supplyChain.service.ts
import { logger } from '../../utils/logger';
import {
  SupplyChainServicesRegistry,
  ISupplyChainDeployment,
  IEndpointData,
  IProductData,
  IEventData,
  IContractStats,
  ISupplyChainEndpoint,
  ISupplyChainProduct,
  ISupplyChainEvent,
  IEndpointResult,
  IProductResult,
  IEventResult
} from '../supplyChain';

export type SupplyChainDeployment = ISupplyChainDeployment;
export type EndpointData = IEndpointData;
export type ProductData = IProductData;
export type EventData = IEventData;
export type ContractStats = IContractStats;

class SupplyChainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'SupplyChainError';
    this.statusCode = statusCode;
  }
}

export class SupplyChainService {
  private static instance: SupplyChainService;
  private readonly registry: SupplyChainServicesRegistry;

  private constructor() {
    this.registry = SupplyChainServicesRegistry.getInstance();
  }

  public static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
  }

  // ===== Instance wrappers for DI usage =====

  public async deployContract(businessId: string, manufacturerName: string) {
    return SupplyChainService.deploySupplyChainContract(businessId, manufacturerName);
  }

  public async createEndpoint(contractAddress: string, endpointData: EndpointData, businessId: string) {
    return SupplyChainService.createEndpoint(contractAddress, endpointData, businessId);
  }

  public async registerProduct(contractAddress: string, productData: ProductData, businessId: string) {
    return SupplyChainService.registerProduct(contractAddress, productData, businessId);
  }

  public async logEvent(contractAddress: string, eventData: EventData, businessId: string) {
    return SupplyChainService.logEvent(contractAddress, eventData, businessId);
  }

  public async getContractStats(contractAddress: string, businessId: string) {
    return SupplyChainService.getContractStats(contractAddress, businessId);
  }

  public async getEndpoints(contractAddress: string, businessId: string) {
    return SupplyChainService.getEndpoints(contractAddress, businessId);
  }

  public async getProducts(contractAddress: string, businessId: string) {
    return SupplyChainService.getProducts(contractAddress, businessId);
  }

  public async getProductEvents(contractAddress: string, productId: string, businessId: string) {
    return SupplyChainService.getProductEvents(contractAddress, productId, businessId);
  }

  // ===== Static legacy API =====

  static async deploySupplyChainContract(
    businessId: string,
    manufacturerName: string
  ): Promise<SupplyChainDeployment> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.deploymentService.deployContract(businessId, manufacturerName);

      if (!result.success) {
        throw new SupplyChainError(result.error || 'Failed to deploy SupplyChain contract', 500);
      }

      return result.deployment;
    } catch (error: any) {
      logger.error('Deploy SupplyChain contract error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to deploy SupplyChain contract');
    }
  }

  static async createEndpoint(
    contractAddress: string,
    endpointData: EndpointData,
    businessId: string
  ): Promise<IEndpointResult> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractWriteService.createEndpoint(contractAddress, endpointData, businessId);

      if (!result.success) {
        throw new SupplyChainError(result.error || 'Failed to create supply chain endpoint', 500);
      }

      return result;
    } catch (error: any) {
      logger.error('Create SupplyChain endpoint error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to create supply chain endpoint');
    }
  }

  static async registerProduct(
    contractAddress: string,
    productData: ProductData,
    businessId: string
  ): Promise<IProductResult> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractWriteService.registerProduct(contractAddress, productData, businessId);

      if (!result.success) {
        throw new SupplyChainError(result.error || 'Failed to register supply chain product', 500);
      }

      return result;
    } catch (error: any) {
      logger.error('Register SupplyChain product error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to register supply chain product');
    }
  }

  static async logEvent(
    contractAddress: string,
    eventData: EventData,
    businessId: string
  ): Promise<IEventResult> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractWriteService.logEvent(contractAddress, eventData, businessId);

      if (!result.success) {
        throw new SupplyChainError(result.error || 'Failed to log supply chain event', 500);
      }

      return result;
    } catch (error: any) {
      logger.error('Log SupplyChain event error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to log supply chain event');
    }
  }

  static async getContractStats(
    contractAddress: string,
    businessId: string
  ): Promise<ContractStats> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractReadService.getContractStats(contractAddress, businessId);

      if (!result.success || !result.data) {
        throw new SupplyChainError(result.error || 'Failed to retrieve supply chain contract stats', 500);
      }

      return result.data;
    } catch (error: any) {
      logger.error('Get SupplyChain contract stats error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to get supply chain contract stats');
    }
  }

  static async getEndpoints(
    contractAddress: string,
    businessId: string
  ): Promise<ISupplyChainEndpoint[]> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractReadService.getEndpoints(contractAddress, businessId);

      if (!result.success || !result.data) {
        throw new SupplyChainError(result.error || 'Failed to retrieve supply chain endpoints', 500);
      }

      return result.data;
    } catch (error: any) {
      logger.error('Get SupplyChain endpoints error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to get supply chain endpoints');
    }
  }

  static async getProducts(
    contractAddress: string,
    businessId: string
  ): Promise<ISupplyChainProduct[]> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractReadService.getProducts(contractAddress, businessId);

      if (!result.success || !result.data) {
        throw new SupplyChainError(result.error || 'Failed to retrieve supply chain products', 500);
      }

      return result.data;
    } catch (error: any) {
      logger.error('Get SupplyChain products error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to get supply chain products');
    }
  }

  static async getProductEvents(
    contractAddress: string,
    productId: string,
    businessId: string
  ): Promise<ISupplyChainEvent[]> {
    const service = SupplyChainService.getInstance();

    try {
      const result = await service.registry.contractReadService.getProductEvents(contractAddress, productId, businessId);

      if (!result.success || !result.data) {
        throw new SupplyChainError(result.error || 'Failed to retrieve supply chain product events', 500);
      }

      return result.data;
    } catch (error: any) {
      logger.error('Get SupplyChain product events error:', error);
      throw SupplyChainService.toSupplyChainError(error, 'Failed to get supply chain product events');
    }
  }

  private static toSupplyChainError(error: any, fallback: string, defaultStatus = 500): SupplyChainError {
    if (error instanceof SupplyChainError) {
      return error;
    }

    const status = typeof error?.statusCode === 'number' ? error.statusCode : defaultStatus;
    const message = error?.message ? `${fallback}: ${error.message}` : fallback;

    return new SupplyChainError(message, status);
  }
}
