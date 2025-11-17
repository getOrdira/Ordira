// src/services/manufacturers/features/supplyChain.service.ts

import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { logger } from '../../../utils/logger';
import { SupplyChainQrCodeService } from '../../supplyChain/features/qrCode.service';
import {
  SupplyChainServicesRegistry,
  DeploymentService,
  ContractReadService,
  ContractWriteService,
  ISupplyChainEndpoint as ModularSupplyChainEndpoint,
  ISupplyChainProduct as ModularSupplyChainProduct,
  ISupplyChainEvent as ModularSupplyChainEvent,
  SupplyChainEventType
} from '../../supplyChain';

export interface SupplyChainContractInfo {
  contractAddress: string;
  manufacturerName: string;
  deployedAt: Date;
  totalEvents: number;
  totalProducts: number;
  totalEndpoints: number;
  isActive: boolean;
}

export interface SupplyChainEndpoint {
  id: number;
  name: string;
  eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
  location: string;
  isActive: boolean;
  eventCount: number;
  createdAt: Date;
}

export interface SupplyChainProduct {
  id: number;
  productId: string;
  name: string;
  description: string;
  totalEvents: number;
  createdAt: Date;
  isActive: boolean;
}

export interface SupplyChainEvent {
  id: number;
  eventType: string;
  productId: string;
  location: string;
  details: string;
  timestamp: Date;
  loggedBy: string;
  isValid: boolean;
}

export interface SupplyChainDashboard {
  contractInfo: SupplyChainContractInfo | null;
  endpoints: SupplyChainEndpoint[];
  products: SupplyChainProduct[];
  recentEvents: SupplyChainEvent[];
  stats: {
    totalEvents: number;
    totalProducts: number;
    totalEndpoints: number;
    eventsThisMonth: number;
  };
}

export interface ProductQrCodeInfo {
  hasQrCode: boolean;
  qrCodeUrl?: string;
  generatedAt?: Date;
  isActive?: boolean;
  productName: string;
}

export interface QrCodeGenerationResult {
  qrCodeUrl: string;
  qrCodeData: string;
  productName: string;
  generatedAt: Date;
}

export interface BatchQrCodeResult {
  productId: string;
  success: boolean;
  qrCodeUrl?: string;
  qrCodeData?: string;
  productName?: string;
  error?: string;
}

/**
 * Custom error class for supply chain operations
 */
class SupplyChainError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'SupplyChainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Supply chain management service - handles blockchain supply chain features
 */
export class SupplyChainService {
  private readonly registry: SupplyChainServicesRegistry;
  private readonly deploymentService: DeploymentService;
  private readonly contractReadService: ContractReadService;
  private readonly contractWriteService: ContractWriteService;
  private qrCodeService: SupplyChainQrCodeService;

  constructor() {
    this.qrCodeService = SupplyChainQrCodeService.getInstance();
    this.registry = SupplyChainServicesRegistry.getInstance();
    this.deploymentService = this.registry.deploymentService;
    this.contractReadService = this.registry.contractReadService;
    this.contractWriteService = this.registry.contractWriteService;
  }

  /**
   * Deploy supply chain contract for manufacturer
   */
  async deploySupplyChainContract(manufacturerId: string, manufacturerName: string): Promise<SupplyChainContractInfo> {
    try {
      // Deploy contract using modular deployment service
      const deploymentResult = await this.deploymentService.deployContract(manufacturerId, manufacturerName);

      if (!deploymentResult.success) {
        throw new SupplyChainError(
          deploymentResult.error || 'Failed to deploy supply chain contract',
          500,
          'DEPLOYMENT_ERROR'
        );
      }

      const deployment = deploymentResult.deployment;

      // Update manufacturer profile with contract info
      await Manufacturer.findByIdAndUpdate(manufacturerId, {
        $set: {
          'supplyChainSettings.contractAddress': deployment.contractAddress,
          'supplyChainSettings.deployedAt': new Date(),
          'supplyChainSettings.isActive': true
        }
      });

      logger.info(`Supply chain contract deployed for manufacturer ${manufacturerId}`, {
        contractAddress: deployment.contractAddress,
        txHash: deployment.txHash,
        blockNumber: deployment.blockNumber
      });

      return {
        contractAddress: deployment.contractAddress,
        manufacturerName,
        deployedAt: new Date(),
        totalEvents: 0,
        totalProducts: 0,
        totalEndpoints: 0,
        isActive: true
      };

    } catch (error: any) {
      throw new SupplyChainError(`Failed to deploy supply chain contract: ${error.message}`, 500, 'DEPLOYMENT_ERROR');
    }
  }

  /**
   * Get supply chain contract info for manufacturer
   */
  async getSupplyChainContractInfo(manufacturerId: string): Promise<SupplyChainContractInfo | null> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        return null;
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const statsResult = await this.contractReadService.getContractStats(contractAddress, manufacturerId);

      if (!statsResult.success || !statsResult.data) {
        throw new SupplyChainError(
          statsResult.error || 'Failed to retrieve supply chain stats',
          500,
          'CONTRACT_INFO_ERROR'
        );
      }

      const stats = statsResult.data;

      return {
        contractAddress,
        manufacturerName: manufacturer.name,
        deployedAt: manufacturer.supplyChainSettings.deployedAt || new Date(),
        totalEvents: stats.totalEvents,
        totalProducts: stats.totalProducts,
        totalEndpoints: stats.totalEndpoints,
        isActive: manufacturer.supplyChainSettings.isActive || false
      };

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain contract info: ${error.message}`, 500, 'CONTRACT_INFO_ERROR');
    }
  }

  /**
   * Create supply chain endpoint
   */
  async createSupplyChainEndpoint(
    manufacturerId: string,
    endpointData: {
      name: string;
      eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
      location: string;
    }
  ): Promise<SupplyChainEndpoint> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        throw new SupplyChainError('No supply chain contract deployed', 400, 'NO_CONTRACT');
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const endpointPayload = {
        ...endpointData,
        eventType: endpointData.eventType as SupplyChainEventType
      };
      const result = await this.contractWriteService.createEndpoint(contractAddress, endpointPayload, manufacturerId);

      if (!result.success) {
        throw new SupplyChainError(
          result.error || 'Failed to create supply chain endpoint',
          500,
          'ENDPOINT_CREATE_ERROR'
        );
      }

      logger.info(`Supply chain endpoint created for manufacturer ${manufacturerId}`, {
        endpointId: result.endpointId,
        endpointName: endpointData.name,
        eventType: endpointData.eventType,
        location: endpointData.location
      });

      return {
        id: result.endpointId,
        name: endpointData.name,
        eventType: endpointData.eventType,
        location: endpointData.location,
        isActive: true,
        eventCount: 0,
        createdAt: new Date()
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to create supply chain endpoint: ${error.message}`, 500, 'ENDPOINT_CREATION_ERROR');
    }
  }

  /**
   * Get all supply chain endpoints
   */
  async getSupplyChainEndpoints(manufacturerId: string): Promise<SupplyChainEndpoint[]> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        return [];
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const endpointsResult = await this.contractReadService.getEndpoints(contractAddress, manufacturerId);

      if (!endpointsResult.success || !endpointsResult.data) {
        throw new SupplyChainError(
          endpointsResult.error || 'Failed to fetch supply chain endpoints',
          500,
          'ENDPOINTS_ERROR'
        );
      }

      return endpointsResult.data.map(endpoint => this.mapEndpoint(endpoint));

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain endpoints: ${error.message}`, 500, 'ENDPOINTS_ERROR');
    }
  }

  /**
   * Register product for supply chain tracking
   */
  async registerSupplyChainProduct(
    manufacturerId: string,
    productData: {
      productId: string;
      name: string;
      description: string;
    }
  ): Promise<SupplyChainProduct> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        throw new SupplyChainError('No supply chain contract deployed', 400, 'NO_CONTRACT');
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const result = await this.contractWriteService.registerProduct(contractAddress, { ...productData }, manufacturerId);

      if (!result.success) {
        throw new SupplyChainError(
          result.error || 'Failed to register supply chain product',
          500,
          'PRODUCT_REGISTRATION_ERROR'
        );
      }

      logger.info(`Supply chain product registered for manufacturer ${manufacturerId}`, {
        productId: result.productId,
        productName: productData.name,
        description: productData.description
      });

      return {
        id: result.productId,
        productId: productData.productId,
        name: productData.name,
        description: productData.description,
        totalEvents: 0,
        createdAt: new Date(),
        isActive: true
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to register supply chain product: ${error.message}`, 500, 'PRODUCT_REGISTRATION_ERROR');
    }
  }

  /**
   * Get all supply chain products
   */
  async getSupplyChainProducts(manufacturerId: string): Promise<SupplyChainProduct[]> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        return [];
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const productsResult = await this.contractReadService.getProducts(contractAddress, manufacturerId);

      if (!productsResult.success || !productsResult.data) {
        throw new SupplyChainError(
          productsResult.error || 'Failed to fetch supply chain products',
          500,
          'PRODUCTS_ERROR'
        );
      }

      return productsResult.data.map(product => this.mapProduct(product));

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain products: ${error.message}`, 500, 'PRODUCTS_ERROR');
    }
  }

  /**
   * Log supply chain event
   */
  async logSupplyChainEvent(
    manufacturerId: string,
    eventData: {
      endpointId: number;
      productId: string;
      eventType: string;
      location: string;
      details: string;
    }
  ): Promise<SupplyChainEvent> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        throw new SupplyChainError('No supply chain contract deployed', 400, 'NO_CONTRACT');
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const result = await this.contractWriteService.logEvent(contractAddress, eventData, manufacturerId);

      if (!result.success) {
        throw new SupplyChainError(
          result.error || 'Failed to log supply chain event',
          500,
          'EVENT_LOG_ERROR'
        );
      }

      logger.info(`Supply chain event logged for manufacturer ${manufacturerId}`, {
        eventId: result.eventId,
        productId: eventData.productId,
        eventType: eventData.eventType,
        location: eventData.location,
        endpointId: eventData.endpointId
      });

      return {
        id: result.eventId,
        eventType: eventData.eventType,
        productId: eventData.productId,
        location: eventData.location,
        details: eventData.details,
        timestamp: new Date(),
        loggedBy: manufacturerId,
        isValid: true
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to log supply chain event: ${error.message}`, 500, 'EVENT_LOGGING_ERROR');
    }
  }

  /**
   * Get supply chain events for a product
   */
  async getSupplyChainProductEvents(manufacturerId: string, productId: string): Promise<SupplyChainEvent[]> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        return [];
      }

      const contractAddress = manufacturer.supplyChainSettings.contractAddress;
      const eventsResult = await this.contractReadService.getProductEvents(contractAddress, productId, manufacturerId);

      if (!eventsResult.success || !eventsResult.data) {
        throw new SupplyChainError(
          eventsResult.error || 'Failed to fetch supply chain product events',
          500,
          'PRODUCT_EVENTS_ERROR'
        );
      }

      return eventsResult.data.map(event => this.mapEvent(event));

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain product events: ${error.message}`, 500, 'PRODUCT_EVENTS_ERROR');
    }
  }

  /**
   * Get supply chain dashboard data
   */
  async getSupplyChainDashboard(manufacturerId: string): Promise<SupplyChainDashboard> {
    try {
      const contractInfo = await this.getSupplyChainContractInfo(manufacturerId);
      const endpoints = await this.getSupplyChainEndpoints(manufacturerId);
      const products = await this.getSupplyChainProducts(manufacturerId);

      // Get recent events from all products (limit to 10 most recent)
      const allEvents: SupplyChainEvent[] = [];
      for (const product of products.slice(0, 5)) { // Limit to first 5 products for performance
        const events = await this.getSupplyChainProductEvents(manufacturerId, product.productId);
        allEvents.push(...events);
      }

      // Sort by timestamp and take most recent 10
      const recentEvents = allEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);

      // Calculate stats
      const totalEvents = allEvents.length;
      const totalProducts = products.length;
      const totalEndpoints = endpoints.length;

      // Count events this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const eventsThisMonth = allEvents.filter(event =>
        event.timestamp >= thisMonth
      ).length;

      return {
        contractInfo,
        endpoints,
        products,
        recentEvents,
        stats: {
          totalEvents,
          totalProducts,
          totalEndpoints,
          eventsThisMonth
        }
      };

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain dashboard: ${error.message}`, 500, 'DASHBOARD_ERROR');
    }
  }

  /**
   * Generate QR code for product supply chain tracking
   */
  async generateProductQrCode(
    manufacturerId: string,
    productId: string
  ): Promise<QrCodeGenerationResult> {
    try {
      // Import Product model dynamically to avoid circular dependencies
      const { Product } = await import('../../../models/products/product.model');

      // Find the product
      const product = await Product.findOne({
        _id: productId,
        manufacturer: manufacturerId
      });

      if (!product) {
        throw new SupplyChainError('Product not found or access denied', 404, 'PRODUCT_NOT_FOUND');
      }

      // Generate QR code using the product's method
      await product.generateSupplyChainQrCode();

      return {
        qrCodeUrl: product.supplyChainQrCode!.qrCodeUrl,
        qrCodeData: product.supplyChainQrCode!.qrCodeData,
        productName: product.title,
        generatedAt: product.supplyChainQrCode!.generatedAt
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to generate QR code: ${error.message}`, 500, 'QR_GENERATION_ERROR');
    }
  }

  /**
   * Generate QR codes for multiple products in batch
   */
  async generateBatchProductQrCodes(
    manufacturerId: string,
    productIds: string[]
  ): Promise<BatchQrCodeResult[]> {
    try {
      const { Product } = await import('../../../models/products/product.model');

      const products = await Product.find({
        _id: { $in: productIds },
        manufacturer: manufacturerId
      });

      const results = await Promise.allSettled(
        products.map(async (product) => {
          await product.generateSupplyChainQrCode();
          return {
            productId: product._id.toString(),
            success: true,
            qrCodeUrl: product.supplyChainQrCode!.qrCodeUrl,
            qrCodeData: product.supplyChainQrCode!.qrCodeData,
            productName: product.title
          };
        })
      );

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            productId: productIds[index],
            success: false,
            error: result.reason.message
          };
        }
      });

    } catch (error: any) {
      throw new SupplyChainError(`Failed to generate batch QR codes: ${error.message}`, 500, 'BATCH_QR_ERROR');
    }
  }

  /**
   * Get QR code information for a product
   */
  async getProductQrCodeInfo(
    manufacturerId: string,
    productId: string
  ): Promise<ProductQrCodeInfo> {
    try {
      const { Product } = await import('../../../models/products/product.model');

      const product = await Product.findOne({
        _id: productId,
        manufacturer: manufacturerId
      }).select('title supplyChainQrCode');

      if (!product) {
        throw new SupplyChainError('Product not found or access denied', 404, 'PRODUCT_NOT_FOUND');
      }

      return {
        hasQrCode: !!product.supplyChainQrCode?.isActive,
        qrCodeUrl: product.supplyChainQrCode?.qrCodeUrl,
        generatedAt: product.supplyChainQrCode?.generatedAt,
        isActive: product.supplyChainQrCode?.isActive,
        productName: product.title
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to get QR code info: ${error.message}`, 500, 'QR_INFO_ERROR');
    }
  }

  /**
   * Update endpoint status
   */
  async updateEndpointStatus(
    manufacturerId: string,
    endpointId: number,
    isActive: boolean
  ): Promise<SupplyChainEndpoint> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);
      if (!manufacturer?.supplyChainSettings?.contractAddress) {
        throw new SupplyChainError('No supply chain contract deployed', 400, 'NO_CONTRACT');
      }

      // Get current endpoints and update the specific one
      const endpoints = await this.getSupplyChainEndpoints(manufacturerId);
      const endpoint = endpoints.find(ep => ep.id === endpointId);

      if (!endpoint) {
        throw new SupplyChainError('Endpoint not found', 404, 'ENDPOINT_NOT_FOUND');
      }

      // Return updated endpoint with new status
      return {
        ...endpoint,
        isActive
      };

    } catch (error: any) {
      if (error instanceof SupplyChainError) {
        throw error;
      }
      throw new SupplyChainError(`Failed to update endpoint status: ${error.message}`, 500, 'ENDPOINT_UPDATE_ERROR');
    }
  }

  /**
   * Deactivate supply chain contract
   */
  async deactivateSupplyChainContract(manufacturerId: string): Promise<{
    success: boolean;
    message: string;
    deactivatedAt: Date;
  }> {
    try {
      const deactivatedAt = new Date();

      await Manufacturer.findByIdAndUpdate(manufacturerId, {
        $set: {
          'supplyChainSettings.isActive': false,
          'supplyChainSettings.deactivatedAt': deactivatedAt
        }
      });

      logger.info(`Supply chain contract deactivated for manufacturer ${manufacturerId}`, {
        deactivatedAt
      });

      return {
        success: true,
        message: 'Supply chain contract has been deactivated',
        deactivatedAt
      };

    } catch (error: any) {
      throw new SupplyChainError(`Failed to deactivate supply chain contract: ${error.message}`, 500, 'DEACTIVATION_ERROR');
    }
  }

  /**
   * Get supply chain statistics
   */
  async getSupplyChainStatistics(manufacturerId: string): Promise<{
    totalContracts: number;
    totalEvents: number;
    totalProducts: number;
    averageEventsPerProduct: number;
    mostActiveEndpoint?: {
      name: string;
      eventCount: number;
    };
    recentActivity: {
      eventsToday: number;
      eventsThisWeek: number;
      eventsThisMonth: number;
    };
  }> {
    try {
      const dashboard = await this.getSupplyChainDashboard(manufacturerId);

      const totalContracts = dashboard.contractInfo ? 1 : 0;
      const totalEvents = dashboard.stats.totalEvents;
      const totalProducts = dashboard.stats.totalProducts;
      const averageEventsPerProduct = totalProducts > 0 ? Math.round(totalEvents / totalProducts) : 0;

      // Find most active endpoint
      const mostActiveEndpoint = dashboard.endpoints.length > 0
        ? dashboard.endpoints.reduce((max, ep) => ep.eventCount > max.eventCount ? ep : max)
        : undefined;

      // Calculate recent activity
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const eventsToday = dashboard.recentEvents.filter(e => e.timestamp >= today).length;
      const eventsThisWeek = dashboard.recentEvents.filter(e => e.timestamp >= thisWeek).length;
      const eventsThisMonth = dashboard.stats.eventsThisMonth;

      return {
        totalContracts,
        totalEvents,
        totalProducts,
        averageEventsPerProduct,
        mostActiveEndpoint: mostActiveEndpoint ? {
          name: mostActiveEndpoint.name,
          eventCount: mostActiveEndpoint.eventCount
        } : undefined,
        recentActivity: {
          eventsToday,
          eventsThisWeek,
          eventsThisMonth
        }
      };

    } catch (error: any) {
      throw new SupplyChainError(`Failed to get supply chain statistics: ${error.message}`, 500, 'STATISTICS_ERROR');
    }
  }

  private mapEndpoint(endpoint: ModularSupplyChainEndpoint): SupplyChainEndpoint {
    return {
      id: endpoint.id,
      name: endpoint.name,
      eventType: endpoint.eventType as SupplyChainEndpoint['eventType'],
      location: endpoint.location,
      isActive: endpoint.isActive,
      eventCount: endpoint.eventCount,
      createdAt: this.toDate(endpoint.createdAt)
    };
  }

  private mapProduct(product: ModularSupplyChainProduct): SupplyChainProduct {
    return {
      id: product.id,
      productId: product.productId,
      name: product.name,
      description: product.description || '',
      totalEvents: product.totalEvents,
      createdAt: this.toDate(product.createdAt),
      isActive: product.isActive
    };
  }

  private mapEvent(event: ModularSupplyChainEvent): SupplyChainEvent {
    return {
      id: event.id,
      eventType: event.eventType,
      productId: event.productId,
      location: event.location || '',
      details: event.details || '',
      timestamp: this.toDate(event.timestamp),
      loggedBy: event.loggedBy || '',
      isValid: event.isValid ?? true
    };
  }

  private toDate(timestamp?: number): Date {
    if (!timestamp || Number.isNaN(timestamp)) {
      return new Date(0);
    }

    if (timestamp < 1_000_000_000_000) {
      return new Date(timestamp * 1000);
    }

    return new Date(timestamp);
  }
}

export const supplyChainService = new SupplyChainService();


