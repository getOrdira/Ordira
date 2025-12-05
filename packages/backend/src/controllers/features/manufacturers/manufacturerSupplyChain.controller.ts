// src/controllers/features/manufacturers/manufacturerSupplyChain.controller.ts
// Manufacturer supply chain controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { supplyChainService } from '../../../services/manufacturers/features/supplyChain.service';

/**
 * Manufacturer supply chain request interfaces
 */
interface DeployContractRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    manufacturerName: string;
  };
}

interface GetContractInfoRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface CreateEndpointRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    name: string;
    eventType: 'sourced' | 'manufactured' | 'quality_checked' | 'packaged' | 'shipped' | 'delivered';
    location: string;
  };
}

interface GetEndpointsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface RegisterProductRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    productId: string;
    name: string;
    description: string;
  };
}

interface GetProductsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface LogEventRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    endpointId: number;
    productId: string;
    eventType: string;
    location: string;
    details: string;
  };
}

interface GetProductEventsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery: {
    productId: string;
  };
}

interface GetDashboardRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GenerateQRCodeRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery: {
    productId: string;
  };
}

interface GenerateBatchQRCodesRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    productIds: string[];
  };
}

interface GetQRCodeInfoRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery: {
    productId: string;
  };
}

interface UpdateEndpointStatusRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    endpointId: number;
    isActive: boolean;
  };
}

interface DeactivateContractRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetStatisticsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

/**
 * Manufacturer supply chain controller
 */
export class ManufacturerSupplyChainController extends BaseController {
  private supplyChainService = supplyChainService;

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/deploy
   * Deploy supply chain contract for manufacturer
   */
  async deploySupplyChainContract(req: DeployContractRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'DEPLOY_SUPPLY_CHAIN_CONTRACT');

        const contractInfo = await this.supplyChainService.deploySupplyChainContract(
          req.validatedParams.manufacturerId,
          req.validatedBody.manufacturerName
        );

        this.logAction(req, 'DEPLOY_SUPPLY_CHAIN_CONTRACT_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          contractAddress: contractInfo.contractAddress,
          manufacturerName: contractInfo.manufacturerName,
          deployedAt: contractInfo.deployedAt
        });

        return { contractInfo };
      });
    }, res, 'Supply chain contract deployed successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/contract
   * Get supply chain contract info for manufacturer
   */
  async getSupplyChainContractInfo(req: GetContractInfoRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_CONTRACT_INFO');

        const contractInfo = await this.supplyChainService.getSupplyChainContractInfo(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_SUPPLY_CHAIN_CONTRACT_INFO_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          hasContract: !!contractInfo,
          contractAddress: contractInfo?.contractAddress
        });

        return { contractInfo };
      });
    }, res, 'Supply chain contract info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/endpoints
   * Create supply chain endpoint
   */
  async createSupplyChainEndpoint(req: CreateEndpointRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'CREATE_SUPPLY_CHAIN_ENDPOINT');

        const endpointData = {
          name: req.validatedBody.name,
          eventType: req.validatedBody.eventType,
          location: req.validatedBody.location
        };

        const endpoint = await this.supplyChainService.createSupplyChainEndpoint(
          req.validatedParams.manufacturerId,
          endpointData
        );

        this.logAction(req, 'CREATE_SUPPLY_CHAIN_ENDPOINT_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          endpointId: endpoint.id,
          endpointName: endpoint.name,
          eventType: endpoint.eventType,
          location: endpoint.location
        });

        return { endpoint };
      });
    }, res, 'Supply chain endpoint created successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/endpoints
   * Get all supply chain endpoints
   */
  async getSupplyChainEndpoints(req: GetEndpointsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_ENDPOINTS');

        const endpoints = await this.supplyChainService.getSupplyChainEndpoints(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_SUPPLY_CHAIN_ENDPOINTS_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          endpointsCount: endpoints.length
        });

        return { endpoints };
      });
    }, res, 'Supply chain endpoints retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/products
   * Register product for supply chain tracking
   */
  async registerSupplyChainProduct(req: RegisterProductRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'REGISTER_SUPPLY_CHAIN_PRODUCT');

        const productData = {
          productId: req.validatedBody.productId,
          name: req.validatedBody.name,
          description: req.validatedBody.description
        };

        const product = await this.supplyChainService.registerSupplyChainProduct(
          req.validatedParams.manufacturerId,
          productData
        );

        this.logAction(req, 'REGISTER_SUPPLY_CHAIN_PRODUCT_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          productId: product.id,
          productName: product.name,
          description: product.description
        });

        return { product };
      });
    }, res, 'Supply chain product registered successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/products
   * Get all supply chain products
   */
  async getSupplyChainProducts(req: GetProductsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_PRODUCTS');

        const products = await this.supplyChainService.getSupplyChainProducts(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_SUPPLY_CHAIN_PRODUCTS_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          productsCount: products.length
        });

        return { products };
      });
    }, res, 'Supply chain products retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/events
   * Log supply chain event
   */
  async logSupplyChainEvent(req: LogEventRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'LOG_SUPPLY_CHAIN_EVENT');

        const eventData = {
          endpointId: req.validatedBody.endpointId,
          productId: req.validatedBody.productId,
          eventType: req.validatedBody.eventType,
          location: req.validatedBody.location,
          details: req.validatedBody.details
        };

        const event = await this.supplyChainService.logSupplyChainEvent(
          req.validatedParams.manufacturerId,
          eventData
        );

        this.logAction(req, 'LOG_SUPPLY_CHAIN_EVENT_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          eventId: event.id,
          productId: event.productId,
          eventType: event.eventType,
          location: event.location,
          endpointId: eventData.endpointId
        });

        return { event };
      });
    }, res, 'Supply chain event logged successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/products/:productId/events
   * Get supply chain events for a product
   */
  async getSupplyChainProductEvents(req: GetProductEventsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_PRODUCT_EVENTS');

        const events = await this.supplyChainService.getSupplyChainProductEvents(
          req.validatedParams.manufacturerId,
          req.validatedQuery.productId
        );

        this.logAction(req, 'GET_SUPPLY_CHAIN_PRODUCT_EVENTS_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          productId: req.validatedQuery.productId,
          eventsCount: events.length
        });

        return { events };
      });
    }, res, 'Supply chain product events retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/dashboard
   * Get supply chain dashboard data
   */
  async getSupplyChainDashboard(req: GetDashboardRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_DASHBOARD');

        const dashboard = await this.supplyChainService.getSupplyChainDashboard(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_SUPPLY_CHAIN_DASHBOARD_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          hasContract: !!dashboard.contractInfo,
          endpointsCount: dashboard.endpoints.length,
          productsCount: dashboard.products.length,
          recentEventsCount: dashboard.recentEvents.length,
          totalEvents: dashboard.stats.totalEvents,
          totalProducts: dashboard.stats.totalProducts,
          totalEndpoints: dashboard.stats.totalEndpoints,
          eventsThisMonth: dashboard.stats.eventsThisMonth
        });

        return { dashboard };
      });
    }, res, 'Supply chain dashboard retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/qrcode/generate
   * Generate QR code for product supply chain tracking
   */
  async generateProductQrCode(req: GenerateQRCodeRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_PRODUCT_QRCODE');

        const qrResult = await this.supplyChainService.generateProductQrCode(
          req.validatedParams.manufacturerId,
          req.validatedQuery.productId
        );

        this.logAction(req, 'GENERATE_PRODUCT_QRCODE_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          productId: req.validatedQuery.productId,
          qrCodeUrl: qrResult.qrCodeUrl,
          productName: qrResult.productName,
          generatedAt: qrResult.generatedAt
        });

        return { qrResult };
      });
    }, res, 'Product QR code generated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/qrcode/batch-generate
   * Generate QR codes for multiple products in batch
   */
  async generateBatchProductQrCodes(req: GenerateBatchQRCodesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_BATCH_PRODUCT_QRCodes');

        const batchResults = await this.supplyChainService.generateBatchProductQrCodes(
          req.validatedParams.manufacturerId,
          req.validatedBody.productIds
        );

        const successCount = batchResults.filter(r => r.success).length;
        const failureCount = batchResults.filter(r => !r.success).length;

        this.logAction(req, 'GENERATE_BATCH_PRODUCT_QRCodes_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          requestedCount: req.validatedBody.productIds.length,
          successCount,
          failureCount
        });

        return { batchResults };
      });
    }, res, 'Batch product QR codes generated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/qrcode/info
   * Get QR code information for a product
   */
  async getProductQrCodeInfo(req: GetQRCodeInfoRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PRODUCT_QRCODE_INFO');

        const qrInfo = await this.supplyChainService.getProductQrCodeInfo(
          req.validatedParams.manufacturerId,
          req.validatedQuery.productId
        );

        this.logAction(req, 'GET_PRODUCT_QRCODE_INFO_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          productId: req.validatedQuery.productId,
          hasQrCode: qrInfo.hasQrCode,
          isActive: qrInfo.isActive,
          productName: qrInfo.productName
        });

        return { qrInfo };
      });
    }, res, 'Product QR code info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/manufacturers/:manufacturerId/supply-chain/endpoints/status
   * Update endpoint status
   */
  async updateEndpointStatus(req: UpdateEndpointStatusRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_ENDPOINT_STATUS');

        const endpoint = await this.supplyChainService.updateEndpointStatus(
          req.validatedParams.manufacturerId,
          req.validatedBody.endpointId,
          req.validatedBody.isActive
        );

        this.logAction(req, 'UPDATE_ENDPOINT_STATUS_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          endpointId: req.validatedBody.endpointId,
          isActive: req.validatedBody.isActive
        });

        return { endpoint };
      });
    }, res, 'Endpoint status updated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/supply-chain/deactivate
   * Deactivate supply chain contract
   */
  async deactivateSupplyChainContract(req: DeactivateContractRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'DEACTIVATE_SUPPLY_CHAIN_CONTRACT');

        const deactivationResult = await this.supplyChainService.deactivateSupplyChainContract(
          req.validatedParams.manufacturerId
        );

        this.logAction(req, 'DEACTIVATE_SUPPLY_CHAIN_CONTRACT_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          success: deactivationResult.success,
          deactivatedAt: deactivationResult.deactivatedAt
        });

        return { deactivationResult };
      });
    }, res, 'Supply chain contract deactivated successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/supply-chain/statistics
   * Get supply chain statistics
   */
  async getSupplyChainStatistics(req: GetStatisticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SUPPLY_CHAIN_STATISTICS');

        const statistics = await this.supplyChainService.getSupplyChainStatistics(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_SUPPLY_CHAIN_STATISTICS_SUCCESS', {
          manufacturerId: req.validatedParams.manufacturerId,
          totalContracts: statistics.totalContracts,
          totalEvents: statistics.totalEvents,
          totalProducts: statistics.totalProducts,
          averageEventsPerProduct: statistics.averageEventsPerProduct,
          mostActiveEndpoint: statistics.mostActiveEndpoint?.name,
          eventsToday: statistics.recentActivity.eventsToday,
          eventsThisWeek: statistics.recentActivity.eventsThisWeek,
          eventsThisMonth: statistics.recentActivity.eventsThisMonth
        });

        return { statistics };
      });
    }, res, 'Supply chain statistics retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerSupplyChainController = new ManufacturerSupplyChainController();
