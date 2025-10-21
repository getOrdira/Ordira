// src/services/supplyChain/core/contractWrite.service.ts
import { BlockchainProviderService } from '../../blockchain/provider.service';
import { logger } from '../../../utils/logger';
import { AssociationService } from './association.service';
import { SupplyChainValidationService } from '../validation/supplyChainValidation.service';
import { LogParsingService } from '../utils/logs';
import { SupplyChainMappers } from '../utils/mappers';
import {
  IEndpointData,
  IProductData,
  IEventData,
  IEndpointResult,
  IProductResult,
  IEventResult,
  IValidationResult
} from '../utils/types';

import supplyChainAbi from '../../../abi/supplyChainAbi.json';

// ===== ERROR CLASS =====

class ContractWriteError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ContractWriteError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class ContractWriteService {
  private static instance: ContractWriteService;
  private associationService: AssociationService;
  private validationService: SupplyChainValidationService;
  private logParsingService: LogParsingService;
  private mappers: SupplyChainMappers;

  private constructor() {
    this.associationService = AssociationService.getInstance();
    this.validationService = SupplyChainValidationService.getInstance();
    this.logParsingService = LogParsingService.getInstance();
    this.mappers = SupplyChainMappers.getInstance();
  }

  public static getInstance(): ContractWriteService {
    if (!ContractWriteService.instance) {
      ContractWriteService.instance = new ContractWriteService();
    }
    return ContractWriteService.instance;
  }

  /**
   * Create an endpoint in a SupplyChain contract
   */
  async createEndpoint(
    contractAddress: string,
    endpointData: IEndpointData,
    businessId: string
  ): Promise<IEndpointResult> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate endpoint data
      const validation = await this.validationService.validateEndpointData(endpointData);
      if (!validation.valid) {
        throw new ContractWriteError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Execute transaction
      const tx = await this.executeCreateEndpoint(contract, endpointData);
      
      // Wait for transaction confirmation
      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new ContractWriteError('Transaction receipt not found', 500);
      }

      // Extract endpoint ID from logs
      const endpointId = this.logParsingService.extractEndpointIdFromLogs([...receipt.logs]);

      logger.info('Endpoint created successfully', {
        businessId,
        contractAddress,
        endpointId: endpointId || 0,
        txHash: tx.hash
      });

      return {
        endpointId: endpointId || 0,
        txHash: tx.hash,
        success: true
      };

    } catch (error: any) {
      logger.error('Create endpoint error:', error);
      
      if (error instanceof ContractWriteError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new ContractWriteError('Insufficient funds for transaction', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractWriteError('Blockchain network error', 503);
      }

      throw new ContractWriteError(`Failed to create endpoint: ${error.message}`, 500);
    }
  }

  /**
   * Register a product in a SupplyChain contract
   */
  async registerProduct(
    contractAddress: string,
    productData: IProductData,
    businessId: string
  ): Promise<IProductResult> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate product data
      const validation = await this.validationService.validateProductData(productData);
      if (!validation.valid) {
        throw new ContractWriteError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Execute transaction
      const tx = await this.executeRegisterProduct(contract, productData);
      
      // Wait for transaction confirmation
      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new ContractWriteError('Transaction receipt not found', 500);
      }

      // Extract product ID from logs
      const productId = this.logParsingService.extractProductIdFromLogs([...receipt.logs]);

      logger.info('Product registered successfully', {
        businessId,
        contractAddress,
        productId: productId || 0,
        txHash: tx.hash
      });

      return {
        productId: productId || 0,
        txHash: tx.hash,
        success: true
      };

    } catch (error: any) {
      logger.error('Register product error:', error);
      
      if (error instanceof ContractWriteError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new ContractWriteError('Insufficient funds for transaction', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractWriteError('Blockchain network error', 503);
      }

      throw new ContractWriteError(`Failed to register product: ${error.message}`, 500);
    }
  }

  /**
   * Log a supply chain event
   */
  async logEvent(
    contractAddress: string,
    eventData: IEventData,
    businessId: string
  ): Promise<IEventResult> {
    try {
      // Validate business-contract association
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      // Validate event data
      const validation = await this.validationService.validateEventData(eventData);
      if (!validation.valid) {
        throw new ContractWriteError(`Validation failed: ${validation.errors.join(', ')}`, 400);
      }

      // Get contract instance
      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      // Execute transaction
      const tx = await this.executeLogEvent(contract, eventData);
      
      // Wait for transaction confirmation
      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new ContractWriteError('Transaction receipt not found', 500);
      }

      // Extract event ID from logs
      const eventId = this.logParsingService.extractEventIdFromLogs([...receipt.logs]);

      logger.info('Event logged successfully', {
        businessId,
        contractAddress,
        eventId: eventId || 0,
        txHash: tx.hash
      });

      return {
        eventId: eventId || 0,
        txHash: tx.hash,
        success: true
      };

    } catch (error: any) {
      logger.error('Log event error:', error);
      
      if (error instanceof ContractWriteError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new ContractWriteError('Insufficient funds for transaction', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new ContractWriteError('Blockchain network error', 503);
      }

      throw new ContractWriteError(`Failed to log event: ${error.message}`, 500);
    }
  }

  /**
   * Batch create multiple endpoints
   */
  async batchCreateEndpoints(
    contractAddress: string,
    endpointsData: IEndpointData[],
    businessId: string
  ): Promise<IEndpointResult[]> {
    try {
      const results: IEndpointResult[] = [];

      for (const endpointData of endpointsData) {
        try {
          const result = await this.createEndpoint(contractAddress, endpointData, businessId);
          results.push(result);
        } catch (error: any) {
          results.push({
            endpointId: 0,
            txHash: '',
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error: any) {
      logger.error('Batch create endpoints error:', error);
      throw new ContractWriteError(`Failed to batch create endpoints: ${error.message}`, 500);
    }
  }

  /**
   * Batch register multiple products
   */
  async batchRegisterProducts(
    contractAddress: string,
    productsData: IProductData[],
    businessId: string
  ): Promise<IProductResult[]> {
    try {
      const results: IProductResult[] = [];

      for (const productData of productsData) {
        try {
          const result = await this.registerProduct(contractAddress, productData, businessId);
          results.push(result);
        } catch (error: any) {
          results.push({
            productId: 0,
            txHash: '',
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error: any) {
      logger.error('Batch register products error:', error);
      throw new ContractWriteError(`Failed to batch register products: ${error.message}`, 500);
    }
  }

  /**
   * Batch log multiple events
   */
  async batchLogEvents(
    contractAddress: string,
    eventsData: IEventData[],
    businessId: string
  ): Promise<IEventResult[]> {
    try {
      const results: IEventResult[] = [];

      for (const eventData of eventsData) {
        try {
          const result = await this.logEvent(contractAddress, eventData, businessId);
          results.push(result);
        } catch (error: any) {
          results.push({
            eventId: 0,
            txHash: '',
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error: any) {
      logger.error('Batch log events error:', error);
      throw new ContractWriteError(`Failed to batch log events: ${error.message}`, 500);
    }
  }

  /**
   * Execute create endpoint transaction
   */
  private async executeCreateEndpoint(
    contract: any,
    endpointData: IEndpointData
  ): Promise<{ hash: string }> {
    return await (contract as unknown as { 
      write: { 
        createEndpoint: (args: [string, string, string]) => Promise<{ hash: string }> 
      } 
    }).write.createEndpoint([
      endpointData.name,
      endpointData.eventType,
      endpointData.location
    ]);
  }

  /**
   * Execute register product transaction
   */
  private async executeRegisterProduct(
    contract: any,
    productData: IProductData
  ): Promise<{ hash: string }> {
    return await (contract as unknown as { 
      write: { 
        registerProduct: (args: [string, string, string]) => Promise<{ hash: string }> 
      } 
    }).write.registerProduct([
      productData.productId,
      productData.name,
      productData.description
    ]);
  }

  /**
   * Execute log event transaction
   */
  private async executeLogEvent(
    contract: any,
    eventData: IEventData
  ): Promise<{ hash: string }> {
    return await (contract as unknown as { 
      write: { 
        logEvent: (args: [bigint, string, string, string, string]) => Promise<{ hash: string }> 
      } 
    }).write.logEvent([
      BigInt(eventData.endpointId),
      eventData.productId,
      eventData.eventType,
      eventData.location,
      eventData.details
    ]);
  }

  /**
   * Estimate gas for create endpoint transaction
   */
  async estimateCreateEndpointGas(
    contractAddress: string,
    endpointData: IEndpointData,
    businessId: string
  ): Promise<bigint> {
    try {
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      return await (contract as unknown as { 
        estimateGas: { 
          createEndpoint: (args: [string, string, string]) => Promise<bigint> 
        } 
      }).estimateGas.createEndpoint([
        endpointData.name,
        endpointData.eventType,
        endpointData.location
      ]);

    } catch (error: any) {
      logger.error('Estimate create endpoint gas error:', error);
      return BigInt(200000); // Default gas limit
    }
  }

  /**
   * Estimate gas for register product transaction
   */
  async estimateRegisterProductGas(
    contractAddress: string,
    productData: IProductData,
    businessId: string
  ): Promise<bigint> {
    try {
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      return await (contract as unknown as { 
        estimateGas: { 
          registerProduct: (args: [string, string, string]) => Promise<bigint> 
        } 
      }).estimateGas.registerProduct([
        productData.productId,
        productData.name,
        productData.description
      ]);

    } catch (error: any) {
      logger.error('Estimate register product gas error:', error);
      return BigInt(200000); // Default gas limit
    }
  }

  /**
   * Estimate gas for log event transaction
   */
  async estimateLogEventGas(
    contractAddress: string,
    eventData: IEventData,
    businessId: string
  ): Promise<bigint> {
    try {
      await this.associationService.validateBusinessContractAssociation(
        contractAddress,
        businessId,
        'supplychain'
      );

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      return await (contract as unknown as { 
        estimateGas: { 
          logEvent: (args: [bigint, string, string, string, string]) => Promise<bigint> 
        } 
      }).estimateGas.logEvent([
        BigInt(eventData.endpointId),
        eventData.productId,
        eventData.eventType,
        eventData.location,
        eventData.details
      ]);

    } catch (error: any) {
      logger.error('Estimate log event gas error:', error);
      return BigInt(200000); // Default gas limit
    }
  }
}
