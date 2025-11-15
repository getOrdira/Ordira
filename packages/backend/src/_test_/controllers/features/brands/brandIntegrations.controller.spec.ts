/**
 * Brand Integrations Controller Unit Tests
 * 
 * Tests brand integration operations: status, configure Shopify/WooCommerce/Wix, test, update, remove, list, permissions, statistics.
 */

import { Response, NextFunction } from 'express';
import { BrandIntegrationsController } from '../../../../controllers/features/brands/brandIntegrations.controller';
import { getBrandsServices } from '../../../../services/container.service';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../../utils/__tests__/testHelpers';

// Mock container service for BaseController
jest.mock('../../../../services/container.service', () => ({
  getServices: jest.fn(() => ({})),
  getBrandsServices: jest.fn(() => ({
    integrations: {
      getIntegrationStatus: jest.fn().mockResolvedValue({ shopify: {}, woocommerce: {} }),
      testShopifyConnection: jest.fn().mockResolvedValue({}),
      configureShopifyIntegration: jest.fn().mockResolvedValue({}),
      updateIntegration: jest.fn().mockResolvedValue({}),
      removeIntegration: jest.fn().mockResolvedValue({}),
      getConfiguredIntegrations: jest.fn().mockReturnValue([]),
      getAvailableIntegrations: jest.fn().mockReturnValue([]),
      checkIntegrationPermissions: jest.fn().mockResolvedValue({}),
      getIntegrationStatistics: jest.fn().mockResolvedValue({}),
    },
    settings: {
      getSettings: jest.fn().mockResolvedValue({}),
    },
  })),
}));

// Mock logger
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('BrandIntegrationsController', () => {
  let brandIntegrationsController: BrandIntegrationsController;
  let mockRequest: any;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockBrandServices: any;

  beforeEach(() => {
    brandIntegrationsController = new BrandIntegrationsController();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    mockBrandServices = getBrandsServices();
    jest.clearAllMocks();

    mockRequest.userId = 'user-id-123';
    mockRequest.userType = 'business';
    mockRequest.businessId = 'business-id-123';
    mockRequest.headers = {};
    mockRequest.performanceMetrics = {};

    (brandIntegrationsController as any).validateBusinessUser = jest.fn(
      (req: any, res: any, callback: any) => callback()
    );
    (brandIntegrationsController as any).recordPerformance = jest.fn();
    (brandIntegrationsController as any).logAction = jest.fn();
    (brandIntegrationsController as any).handleAsync = jest.fn(
      async (fn: any, res: any, message: string) => {
        try {
          const result = await fn();
          res.status(200).json({ success: true, data: result, message });
        } catch (error: any) {
          res.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }
    );
    (brandIntegrationsController as any).getRequestMeta = jest.fn().mockReturnValue({});
  });

  describe('getIntegrationStatus', () => {
    const mockStatus = {
      shopify: { connected: true, lastSync: new Date() },
      woocommerce: { connected: false },
    };

    beforeEach(() => {
      (mockBrandServices.integrations.getIntegrationStatus as jest.Mock).mockResolvedValue(
        mockStatus
      );
    });

    it('should retrieve integration status', async () => {
      await brandIntegrationsController.getIntegrationStatus(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.integrations.getIntegrationStatus).toHaveBeenCalledWith(
        'business-id-123'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.status).toEqual(mockStatus);
      expect(Object.keys(responseData.data.status).length).toBeGreaterThan(0);
    });
  });

  describe('testShopifyConnection', () => {
    const mockTestResult = {
      success: true,
      latency: 150,
      message: 'Connection successful',
    };

    beforeEach(() => {
      (mockBrandServices.integrations.testShopifyConnection as jest.Mock).mockResolvedValue(
        mockTestResult
      );
    });

    it('should test Shopify connection successfully', async () => {
      mockRequest.validatedBody = {
        shopDomain: 'test.myshopify.com',
        accessToken: 'token-123',
      };

      await brandIntegrationsController.testShopifyConnection(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.testShopifyConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          shopifyDomain: 'test.myshopify.com',
          shopifyAccessToken: 'token-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('configureShopifyIntegration', () => {
    const mockConfiguration = {
      configured: true,
      shopDomain: 'test.myshopify.com',
    };

    beforeEach(() => {
      (mockBrandServices.integrations.configureShopifyIntegration as jest.Mock).mockResolvedValue(
        mockConfiguration
      );
    });

    it('should configure Shopify integration successfully', async () => {
      mockRequest.validatedBody = {
        shopDomain: 'test.myshopify.com',
        accessToken: 'token-123',
        webhookSecret: 'secret-123',
      };

      await brandIntegrationsController.configureShopifyIntegration(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.configureShopifyIntegration).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          shopifyDomain: 'test.myshopify.com',
          shopifyAccessToken: 'token-123',
          shopifyWebhookSecret: 'secret-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('configureWooCommerceIntegration', () => {
    beforeEach(() => {
      (mockBrandServices.integrations.updateIntegration as jest.Mock).mockResolvedValue({});
    });

    it('should configure WooCommerce integration successfully', async () => {
      mockRequest.validatedBody = {
        wooDomain: 'test.com',
        wooConsumerKey: 'key-123',
        wooConsumerSecret: 'secret-123',
      };

      await brandIntegrationsController.configureWooCommerceIntegration(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.updateIntegration).toHaveBeenCalledWith(
        'business-id-123',
        'woocommerce',
        expect.objectContaining({
          wooDomain: 'test.com',
          wooConsumerKey: 'key-123',
          wooConsumerSecret: 'secret-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('configureWixIntegration', () => {
    beforeEach(() => {
      (mockBrandServices.integrations.updateIntegration as jest.Mock).mockResolvedValue({});
    });

    it('should configure Wix integration successfully', async () => {
      mockRequest.validatedBody = {
        wixDomain: 'test.wixsite.com',
        wixApiKey: 'key-123',
        wixRefreshToken: 'refresh-123',
      };

      await brandIntegrationsController.configureWixIntegration(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.updateIntegration).toHaveBeenCalledWith(
        'business-id-123',
        'wix',
        expect.objectContaining({
          wixDomain: 'test.wixsite.com',
          wixApiKey: 'key-123',
          wixRefreshToken: 'refresh-123',
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateIntegration', () => {
    beforeEach(() => {
      (mockBrandServices.integrations.updateIntegration as jest.Mock).mockResolvedValue({});
    });

    it('should update integration successfully', async () => {
      mockRequest.validatedParams = {
        type: 'shopify',
      };
      mockRequest.validatedBody = {
        credentials: {
          accessToken: 'new-token-123',
        },
      };

      await brandIntegrationsController.updateIntegration(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.integrations.updateIntegration).toHaveBeenCalledWith(
        'business-id-123',
        'shopify',
        { accessToken: 'new-token-123' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('removeIntegration', () => {
    const mockResult = {
      dataRemoved: true,
      removedAt: new Date(),
    };

    beforeEach(() => {
      (mockBrandServices.integrations.removeIntegration as jest.Mock).mockResolvedValue(
        mockResult
      );
    });

    it('should remove integration successfully', async () => {
      mockRequest.validatedParams = {
        type: 'shopify',
      };

      await brandIntegrationsController.removeIntegration(mockRequest, mockResponse, mockNext);

      expect(mockBrandServices.integrations.removeIntegration).toHaveBeenCalledWith(
        'business-id-123',
        'shopify'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getConfiguredIntegrations', () => {
    const mockConfigured = ['shopify', 'woocommerce'];

    beforeEach(() => {
      (mockBrandServices.settings.getSettings as jest.Mock).mockResolvedValue({
        shopifyIntegration: {},
        woocommerceIntegration: {},
      });
      (mockBrandServices.integrations.getConfiguredIntegrations as jest.Mock).mockReturnValue(
        mockConfigured
      );
    });

    it('should retrieve configured integrations', async () => {
      await brandIntegrationsController.getConfiguredIntegrations(
        mockRequest,
        mockResponse,
        mockNext
      );

      const mockSettings = {
        shopifyIntegration: {},
        woocommerceIntegration: {},
      };
      expect(mockBrandServices.settings.getSettings).toHaveBeenCalledWith('business-id-123');
      expect(mockBrandServices.integrations.getConfiguredIntegrations).toHaveBeenCalledWith(
        mockSettings
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);

      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.configured).toEqual(mockConfigured);
    });
  });

  describe('getAvailableIntegrations', () => {
    const mockAvailable = [
      { type: 'shopify', name: 'Shopify', available: true },
      { type: 'woocommerce', name: 'WooCommerce', available: true },
    ];

    beforeEach(() => {
      (mockBrandServices.integrations.getAvailableIntegrations as jest.Mock).mockReturnValue(
        mockAvailable
      );
    });

    it('should retrieve available integrations for plan', async () => {
      mockRequest.query = {
        plan: 'premium',
      };

      await brandIntegrationsController.getAvailableIntegrations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.getAvailableIntegrations).toHaveBeenCalledWith(
        'premium'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should use foundation plan as default', async () => {
      mockRequest.query = {};

      await brandIntegrationsController.getAvailableIntegrations(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.getAvailableIntegrations).toHaveBeenCalledWith(
        'foundation'
      );
    });
  });

  describe('checkIntegrationPermissions', () => {
    beforeEach(() => {
      (mockBrandServices.integrations.checkIntegrationPermissions as jest.Mock).mockReturnValue(
        true
      );
    });

    it('should check integration permissions', async () => {
      mockRequest.validatedQuery = {
        integrationType: 'shopify',
      };
      mockRequest.query = {
        userPlan: 'premium',
      };

      await brandIntegrationsController.checkIntegrationPermissions(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.checkIntegrationPermissions).toHaveBeenCalledWith(
        'premium',
        'shopify'
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getIntegrationStatistics', () => {
    const mockStats = {
      totalIntegrations: 100,
      shopifyIntegrations: 50,
      woocommerceIntegrations: 30,
    };

    beforeEach(() => {
      (mockBrandServices.integrations.getIntegrationStatistics as jest.Mock).mockResolvedValue(
        mockStats
      );
    });

    it('should retrieve integration statistics', async () => {
      await brandIntegrationsController.getIntegrationStatistics(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockBrandServices.integrations.getIntegrationStatistics).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const serviceError = {
        statusCode: 500,
        message: 'Integration service unavailable',
      };
      (mockBrandServices.integrations.getIntegrationStatus as jest.Mock).mockRejectedValue(
        serviceError
      );

      await brandIntegrationsController.getIntegrationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', async () => {
      (mockBrandServices.integrations.getIntegrationStatus as jest.Mock).mockResolvedValue({});

      await brandIntegrationsController.getIntegrationStatus(
        mockRequest,
        mockResponse,
        mockNext
      );

      expect((brandIntegrationsController as any).recordPerformance).toHaveBeenCalledWith(
        mockRequest,
        'GET_INTEGRATION_STATUS'
      );
    });
  });
});
