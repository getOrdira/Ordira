// src/services/blockchain/supplyChain.service.ts
import { BlockchainProviderService } from './provider.service';
import { BlockchainContractsService } from './contracts.service';
import { UtilsService } from '../utils/utils.service';
import { createAppError } from '../../middleware/error.middleware';

import supplyChainAbi from '../../abi/supplyChainAbi.json';
import supplyChainFactoryAbi from '../../abi/supplyChainFactoryAbi.json';

// ===== INTERFACES =====

export interface SupplyChainDeployment {
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  deploymentCost: string;
  businessId: string;
  manufacturerName: string;
}

export interface EndpointData {
  name: string;
  eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
  location: string;
}

export interface ProductData {
  productId: string;
  name: string;
  description: string;
}

export interface EventData {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details: string;
}

export interface ContractStats {
  totalEvents: number;
  totalProducts: number;
  totalEndpoints: number;
  businessId: string;
  manufacturerName: string;
}

// ===== ERROR CLASS =====

class SupplyChainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'SupplyChainError';
    this.statusCode = statusCode;
  }
}

// ===== MAIN SERVICE CLASS =====

export class SupplyChainService {
  private static instance: SupplyChainService;
  private provider: BlockchainProviderService;
  private contractsService: BlockchainContractsService;

  private constructor() {
    this.provider = BlockchainProviderService;
    this.contractsService = new BlockchainContractsService();
  }

  public static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
  }

  // ===== FACTORY CONTRACT MANAGEMENT =====

  /**
   * Get the SupplyChain factory contract
   */
  private async getSupplyChainFactoryContract() {
    const { FactorySettings } = require('../../models/factorySettings.model');
    const factorySettings = await FactorySettings.findOne({ type: 'supplychain' });

    if (!factorySettings?.address) {
      throw new SupplyChainError('SupplyChain factory not deployed. Please deploy factory first.', 500);
    }

    return BlockchainProviderService.getContract(factorySettings.address, supplyChainFactoryAbi);
  }

  /**
   * Deploy a new SupplyChain contract for a business
   */
  static async deploySupplyChainContract(
    businessId: string,
    manufacturerName: string
  ): Promise<SupplyChainDeployment> {
    try {
      if (!businessId?.trim()) {
        throw new SupplyChainError('Business ID is required', 400);
      }
      if (!manufacturerName?.trim()) {
        throw new SupplyChainError('Manufacturer name is required', 400);
      }

      const service = SupplyChainService.getInstance();
      const factoryContract = await service.getSupplyChainFactoryContract();

      // Estimate gas for deployment
      const gasEstimate = await (factoryContract as any).estimateGas.deploySupplyChain(
        [businessId, manufacturerName],
        { value: '10000000000000000' } // 0.01 ETH deployment fee
      );

      // Deploy contract
      const tx = await (factoryContract as any).write.deploySupplyChain(
        [businessId, manufacturerName],
        {
          value: '10000000000000000', // 0.01 ETH
          gasLimit: gasEstimate * BigInt(2) // Add buffer
        }
      );

      // Wait for transaction confirmation
      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new SupplyChainError('Transaction receipt not found', 500);
      }

      // Extract contract address from logs
      const contractAddress = service.extractContractAddressFromLogs([...receipt.logs]);
      
      if (!contractAddress) {
        throw new SupplyChainError('Contract address not found in transaction logs', 500);
      }

      // Store business-contract mapping
      await service.storeBusinessContractMapping(businessId, contractAddress, 'supplychain');

      return {
        contractAddress,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        deploymentCost: '10000000000000000', // 0.01 ETH
        businessId,
        manufacturerName
      };

    } catch (error: any) {
      console.error('Deploy SupplyChain contract error:', error);
      
      if (error instanceof SupplyChainError) {
        throw error;
      }

      // Handle blockchain errors
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new SupplyChainError('Insufficient funds for contract deployment', 400);
      }
      if (error.code === 'NETWORK_ERROR') {
        throw new SupplyChainError('Blockchain network error during deployment', 503);
      }

      throw new SupplyChainError(`Failed to deploy SupplyChain contract: ${error.message}`, 500);
    }
  }

  // ===== CONTRACT INTERACTION =====

  /**
   * Create an endpoint in a SupplyChain contract
   */
  static async createEndpoint(
    contractAddress: string,
    endpointData: EndpointData,
    businessId: string
  ): Promise<{ endpointId: number; txHash: string }> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      const tx = await (contract as any).write.createEndpoint([
        endpointData.name,
        endpointData.eventType,
        endpointData.location
      ]);

      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      // Extract endpoint ID from logs
      const endpointId = SupplyChainService.getInstance().extractEndpointIdFromLogs([...receipt.logs]);

      return {
        endpointId: endpointId || 0,
        txHash: tx.hash
      };

    } catch (error: any) {
      console.error('Create endpoint error:', error);
      throw new SupplyChainError(`Failed to create endpoint: ${error.message}`, 500);
    }
  }

  /**
   * Register a product in a SupplyChain contract
   */
  static async registerProduct(
    contractAddress: string,
    productData: ProductData,
    businessId: string
  ): Promise<{ productId: number; txHash: string }> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      const tx = await (contract as any).write.registerProduct([
        productData.productId,
        productData.name,
        productData.description
      ]);

      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      // Extract product ID from logs
      const productId = SupplyChainService.getInstance().extractProductIdFromLogs([...receipt.logs]);

      return {
        productId: productId || 0,
        txHash: tx.hash
      };

    } catch (error: any) {
      console.error('Register product error:', error);
      throw new SupplyChainError(`Failed to register product: ${error.message}`, 500);
    }
  }

  /**
   * Log a supply chain event
   */
  static async logEvent(
    contractAddress: string,
    eventData: EventData,
    businessId: string
  ): Promise<{ eventId: number; txHash: string }> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      
      const tx = await (contract as any).write.logEvent([
        BigInt(eventData.endpointId),
        eventData.productId,
        eventData.eventType,
        eventData.location,
        eventData.details
      ]);

      const receipt = await BlockchainProviderService.waitForTransaction(tx.hash);
      
      // Extract event ID from logs
      const eventId = SupplyChainService.getInstance().extractEventIdFromLogs([...receipt.logs]);

      return {
        eventId: eventId || 0,
        txHash: tx.hash
      };

    } catch (error: any) {
      console.error('Log event error:', error);
      throw new SupplyChainError(`Failed to log event: ${error.message}`, 500);
    }
  }

  // ===== QUERY FUNCTIONS =====

  /**
   * Get contract statistics
   */
  static async getContractStats(contractAddress: string, businessId: string): Promise<ContractStats> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      const stats = await (contract as any).read.getContractStats();

      return {
        totalEvents: Number(stats[0]),
        totalProducts: Number(stats[1]),
        totalEndpoints: Number(stats[2]),
        businessId: stats[3],
        manufacturerName: stats[4]
      };

    } catch (error: any) {
      console.error('Get contract stats error:', error);
      throw new SupplyChainError(`Failed to get contract stats: ${error.message}`, 500);
    }
  }

  /**
   * Get all endpoints for a contract
   */
  static async getEndpoints(contractAddress: string, businessId: string): Promise<any[]> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      const endpointIds = await (contract as any).read.getManufacturerEndpoints();

      const endpoints = [];
      for (const id of endpointIds) {
        const endpoint = await (contract as any).read.getEndpoint([id]);
        endpoints.push({
          id: Number(id),
          name: endpoint.name,
          eventType: endpoint.eventType,
          location: endpoint.location,
          isActive: endpoint.isActive,
          eventCount: Number(endpoint.eventCount),
          createdAt: Number(endpoint.createdAt)
        });
      }

      return endpoints;

    } catch (error: any) {
      console.error('Get endpoints error:', error);
      throw new SupplyChainError(`Failed to get endpoints: ${error.message}`, 500);
    }
  }

  /**
   * Get all products for a contract
   */
  static async getProducts(contractAddress: string, businessId: string): Promise<any[]> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      const productIds = await (contract as any).read.getManufacturerProducts();

      const products = [];
      for (const id of productIds) {
        const product = await (contract as any).read.getProduct([id]);
        products.push({
          id: Number(id),
          productId: product.productId,
          name: product.name,
          description: product.description,
          totalEvents: Number(product.totalEvents),
          createdAt: Number(product.createdAt),
          isActive: product.isActive
        });
      }

      return products;

    } catch (error: any) {
      console.error('Get products error:', error);
      throw new SupplyChainError(`Failed to get products: ${error.message}`, 500);
    }
  }

  /**
   * Get events for a specific product
   */
  static async getProductEvents(
    contractAddress: string, 
    productId: string, 
    businessId: string
  ): Promise<any[]> {
    try {
      await SupplyChainService.getInstance().validateBusinessContractAssociation(contractAddress, businessId);

      const contract = BlockchainProviderService.getContract(contractAddress, supplyChainAbi);
      const eventIds = await (contract as any).read.getProductEvents([productId]);

      const events = [];
      for (const id of eventIds) {
        const event = await (contract as any).read.getEvent([id]);
        events.push({
          id: Number(id),
          eventType: event.eventType,
          productId: event.productId,
          location: event.location,
          details: event.details,
          timestamp: Number(event.timestamp),
          loggedBy: event.loggedBy,
          isValid: event.isValid
        });
      }

      return events;

    } catch (error: any) {
      console.error('Get product events error:', error);
      throw new SupplyChainError(`Failed to get product events: ${error.message}`, 500);
    }
  }

  // ===== UTILITY FUNCTIONS =====

  /**
   * Store business-contract mapping
   */
  private async storeBusinessContractMapping(
    businessId: string,
    contractAddress: string,
    contractType: 'supplychain'
  ): Promise<void> {
    try {
      const { BrandSettings } = require('../../models/brandSettings.model');
      
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          $set: { 
            [`web3Settings.supplyChainContract`]: contractAddress,
            [`supplyChainSettings.contractDeployedAt`]: new Date(),
            [`supplyChainSettings.networkId`]: process.env.CHAIN_ID || '8453'
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Failed to store business contract mapping:', error);
      // Don't throw - contract deployment should succeed even if mapping fails
    }
  }

  /**
   * Validate business-contract association
   */
  private async validateBusinessContractAssociation(
    contractAddress: string,
    businessId: string
  ): Promise<void> {
    try {
      const { BrandSettings } = require('../../models/brandSettings.model');
      
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      
      if (!brandSettings?.web3Settings?.supplyChainContract) {
        throw new SupplyChainError('No supply chain contract deployed for this business', 404);
      }

      if (brandSettings.web3Settings.supplyChainContract !== contractAddress) {
        throw new SupplyChainError('Contract address does not match business association', 403);
      }
    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to validate contract association: ${error.message}`, 500);
    }
  }

  /**
   * Extract contract address from transaction logs
   */
  private extractContractAddressFromLogs(logs: any[]): string | null {
    // Implementation depends on your event structure
    // This is a simplified version
    for (const log of logs) {
      if (log.topics && log.topics.length > 0) {
        // Extract address from log data
        return log.address;
      }
    }
    return null;
  }

  /**
   * Extract endpoint ID from transaction logs
   */
  private extractEndpointIdFromLogs(logs: any[]): number | null {
    // Implementation depends on your event structure
    return null;
  }

  /**
   * Extract product ID from transaction logs
   */
  private extractProductIdFromLogs(logs: any[]): number | null {
    // Implementation depends on your event structure
    return null;
  }

  /**
   * Extract event ID from transaction logs
   */
  private extractEventIdFromLogs(logs: any[]): number | null {
    // Implementation depends on your event structure
    return null;
  }
}
