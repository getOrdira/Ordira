// src/services/supplyChain/core/contractRead.service.ts
import { BlockchainProviderService } from '../../blockchain/provider.service';
import { logger } from '../../../utils/logger';
import { AssociationService } from './association.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { SupplyChainMappers } from '../utils/mappers';
import {
  IContractStats,
  ISupplyChainEndpoint,
  ISupplyChainProduct,
  ISupplyChainEvent,
  IPaginatedResponse,
  IApiResponse
} from '../utils/types';

import supplyChainAbi from '../../../abi/supplyChainAbi.json';

// ===== INTERFACES =====

export interface IReadOptions {
  page?: number;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

export interface IContractReadResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===== ERROR CLASS =====

class ContractReadError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ContractReadError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class ContractReadService {
  private static instance: ContractReadService;
  private associationService: AssociationService;
  private validationService: SupplyChainValidationService;
  private mappers: SupplyChainMappers;

  private constructor() {
    this.associationService = AssociationService.getInstance();
    this.validationService = SupplyChainValidationService.getInstance();
    this.mappers = SupplyChainMappers.getInstance();
  }

  public static getInstance(): ContractReadService {
    if (!ContractReadService.instance) {
      ContractReadService.instance = new ContractReadService();
    }
    return ContractReadService.instance;
  }

  /**
   * Get contract statistics
   */
  async getContractStats(
    contractAddress: string,
    businessId: string
  ): Promise<IContractReadResult<IContractStats>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Call contract method
      const stats = await this.executeGetContractStats(contract);

      // Map response
      const mappedStats = this.mappers.mapContractStats(stats);

      logger.info('Contract stats retrieved successfully', {
        businessId,
        contractAddress,
        stats: mappedStats
      });

      return {
        success: true,
        data: mappedStats
      };

    } catch (error: any) {
      logger.error('Get contract stats error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get contract stats: ${error.message}`, 500);
    }
  }

  /**
   * Get all endpoints for a contract
   */
  async getEndpoints(
    contractAddress: string,
    businessId: string,
    options: IReadOptions = {}
  ): Promise<IContractReadResult<ISupplyChainEndpoint[]>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get endpoint IDs
      const endpointIds = await this.executeGetManufacturerEndpoints(contract);

      // Get endpoint details
      const endpoints: ISupplyChainEndpoint[] = [];
      for (const id of endpointIds) {
        try {
          const endpoint = await this.executeGetEndpoint(contract, id);
          const mappedEndpoint = this.mappers.mapEndpoint(id, endpoint);
          
          // Apply filters
          if (options.includeInactive || mappedEndpoint.isActive) {
            endpoints.push(mappedEndpoint);
          }
        } catch (error: any) {
          logger.warn('Failed to get endpoint details', { id, error: error.message });
        }
      }

      // Apply pagination
      const paginatedEndpoints = this.applyPagination(endpoints, options);

      logger.info('Endpoints retrieved successfully', {
        businessId,
        contractAddress,
        totalEndpoints: endpoints.length,
        returnedEndpoints: paginatedEndpoints.data.length
      });

      return {
        success: true,
        data: paginatedEndpoints.data,
        pagination: paginatedEndpoints.pagination
      };

    } catch (error: any) {
      logger.error('Get endpoints error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get endpoints: ${error.message}`, 500);
    }
  }

  /**
   * Get all products for a contract
   */
  async getProducts(
    contractAddress: string,
    businessId: string,
    options: IReadOptions = {}
  ): Promise<IContractReadResult<ISupplyChainProduct[]>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get product IDs
      const productIds = await this.executeGetManufacturerProducts(contract);

      // Get product details
      const products: ISupplyChainProduct[] = [];
      for (const id of productIds) {
        try {
          const product = await this.executeGetProduct(contract, id);
          const mappedProduct = this.mappers.mapProduct(id, product);
          
          // Apply filters
          if (options.includeInactive || mappedProduct.isActive) {
            products.push(mappedProduct);
          }
        } catch (error: any) {
          logger.warn('Failed to get product details', { id, error: error.message });
        }
      }

      // Apply pagination
      const paginatedProducts = this.applyPagination(products, options);

      logger.info('Products retrieved successfully', {
        businessId,
        contractAddress,
        totalProducts: products.length,
        returnedProducts: paginatedProducts.data.length
      });

      return {
        success: true,
        data: paginatedProducts.data,
        pagination: paginatedProducts.pagination
      };

    } catch (error: any) {
      logger.error('Get products error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get products: ${error.message}`, 500);
    }
  }

  /**
   * Get events for a specific product
   */
  async getProductEvents(
    contractAddress: string,
    productId: string,
    businessId: string,
    options: IReadOptions = {}
  ): Promise<IContractReadResult<ISupplyChainEvent[]>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address and product ID
      const validation = await this.validationService.validateAll({
        contractAddress,
        product: { productId: productId, name: '', description: '' }
      });
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get event IDs for product
      const eventIds = await this.executeGetProductEvents(contract, productId);

      // Get event details
      const events: ISupplyChainEvent[] = [];
      for (const id of eventIds) {
        try {
          const event = await this.executeGetEvent(contract, id);
          const mappedEvent = this.mappers.mapEvent(id, event);
          events.push(mappedEvent);
        } catch (error: any) {
          logger.warn('Failed to get event details', { id, error: error.message });
        }
      }

      // Apply pagination
      const paginatedEvents = this.applyPagination(events, options);

      logger.info('Product events retrieved successfully', {
        businessId,
        contractAddress,
        productId,
        totalEvents: events.length,
        returnedEvents: paginatedEvents.data.length
      });

      return {
        success: true,
        data: paginatedEvents.data,
        pagination: paginatedEvents.pagination
      };

    } catch (error: any) {
      logger.error('Get product events error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get product events: ${error.message}`, 500);
    }
  }

  /**
   * Get a specific endpoint by ID
   */
  async getEndpoint(
    contractAddress: string,
    endpointId: number,
    businessId: string
  ): Promise<IContractReadResult<ISupplyChainEndpoint>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get endpoint details
      const endpoint = await this.executeGetEndpoint(contract, BigInt(endpointId));
      const mappedEndpoint = this.mappers.mapEndpoint(BigInt(endpointId), endpoint);

      logger.info('Endpoint retrieved successfully', {
        businessId,
        contractAddress,
        endpointId
      });

      return {
        success: true,
        data: mappedEndpoint
      };

    } catch (error: any) {
      logger.error('Get endpoint error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get endpoint: ${error.message}`, 500);
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProduct(
    contractAddress: string,
    productId: number,
    businessId: string
  ): Promise<IContractReadResult<ISupplyChainProduct>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get product details
      const product = await this.executeGetProduct(contract, BigInt(productId));
      const mappedProduct = this.mappers.mapProduct(BigInt(productId), product);

      logger.info('Product retrieved successfully', {
        businessId,
        contractAddress,
        productId
      });

      return {
        success: true,
        data: mappedProduct
      };

    } catch (error: any) {
      logger.error('Get product error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get product: ${error.message}`, 500);
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(
    contractAddress: string,
    eventId: number,
    businessId: string
  ): Promise<IContractReadResult<ISupplyChainEvent>> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate contract address
      const validation = await this.validationService.validateContractAddress(contractAddress);
      if (!validation.valid) {
        throw new ContractReadError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Get event details
      const event = await this.executeGetEvent(contract, BigInt(eventId));
      const mappedEvent = this.mappers.mapEvent(BigInt(eventId), event);

      logger.info('Event retrieved successfully', {
        businessId,
        contractAddress,
        eventId
      });

      return {
        success: true,
        data: mappedEvent
      };

    } catch (error: any) {
      logger.error('Get event error:', error);
      
      if (error instanceof ContractReadError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractReadError('Blockchain network error', 503);
      }

      throw new ContractReadError(`Failed to get event: ${error.message}`, 500);
    }
  }

  /**
   * Execute get contract stats call
   */
  private async executeGetContractStats(contract: any): Promise<[bigint, bigint, bigint, string, string]> {
    return await (contract as unknown as { 
      read: { 
        getContractStats: () => Promise<[bigint, bigint, bigint, string, string]> 
      } 
    }).read.getContractStats();
  }

  /**
   * Execute get manufacturer endpoints call
   */
  private async executeGetManufacturerEndpoints(contract: any): Promise<bigint[]> {
    return await (contract as unknown as { 
      read: { 
        getManufacturerEndpoints: () => Promise<bigint[]> 
      } 
    }).read.getManufacturerEndpoints();
  }

  /**
   * Execute get manufacturer products call
   */
  private async executeGetManufacturerProducts(contract: any): Promise<bigint[]> {
    return await (contract as unknown as { 
      read: { 
        getManufacturerProducts: () => Promise<bigint[]> 
      } 
    }).read.getManufacturerProducts();
  }

  /**
   * Execute get product events call
   */
  private async executeGetProductEvents(contract: any, productId: string): Promise<bigint[]> {
    return await (contract as unknown as { 
      read: { 
        getProductEvents: (args: [string]) => Promise<bigint[]> 
      } 
    }).read.getProductEvents([productId]);
  }

  /**
   * Execute get endpoint call
   */
  private async executeGetEndpoint(contract: any, id: bigint): Promise<{
    name: string;
    eventType: string;
    isActive: boolean;
    location?: string;
    eventCount?: bigint;
    createdAt?: bigint;
  }> {
    return await (contract as unknown as { 
      read: { 
        getEndpoint: (args: [bigint]) => Promise<{
          name: string;
          eventType: string;
          isActive: boolean;
          location?: string;
          eventCount?: bigint;
          createdAt?: bigint;
        }> 
      } 
    }).read.getEndpoint([id]);
  }

  /**
   * Execute get product call
   */
  private async executeGetProduct(contract: any, id: bigint): Promise<{
    productId: string;
    name: string;
    isActive: boolean;
    description?: string;
    totalEvents?: bigint;
    createdAt?: bigint;
  }> {
    return await (contract as unknown as { 
      read: { 
        getProduct: (args: [bigint]) => Promise<{
          productId: string;
          name: string;
          isActive: boolean;
          description?: string;
          totalEvents?: bigint;
          createdAt?: bigint;
        }> 
      } 
    }).read.getProduct([id]);
  }

  /**
   * Execute get event call
   */
  private async executeGetEvent(contract: any, id: bigint): Promise<{
    endpointId: bigint;
    productId: string;
    eventData: string;
    timestamp: bigint;
    eventType?: string;
    location?: string;
    details?: string;
    loggedBy?: string;
    isValid?: boolean;
  }> {
    return await (contract as unknown as { 
      read: { 
        getEvent: (args: [bigint]) => Promise<{
          endpointId: bigint;
          productId: string;
          eventData: string;
          timestamp: bigint;
          eventType?: string;
          location?: string;
          details?: string;
          loggedBy?: string;
          isValid?: boolean;
        }> 
      } 
    }).read.getEvent([id]);
  }

  /**
   * Apply pagination to results
   */
  private applyPagination<T>(
    data: T[],
    options: IReadOptions
  ): { data: T[]; pagination: any } {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = options.offset || (page - 1) * limit;

    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = data.slice(offset, offset + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}
