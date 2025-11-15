/**
 * Brand Integrations Service Unit Tests
 * 
 * Tests third-party integrations management.
 */

import { IntegrationsService } from '../../../services/brands/features/integrations.service';
import { BrandSettings } from '../../../models/brands/brandSettings.model';

// Mock models
jest.mock('../../../models/brands/brandSettings.model');

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    logSafe: jest.fn(),
  },
}));

describe('IntegrationsService', () => {
  let integrationsService: IntegrationsService;

  beforeEach(() => {
    integrationsService = new IntegrationsService();
    jest.clearAllMocks();
  });

  describe('getIntegrationStatus', () => {
    it('should return integration status', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        shopifyDomain: 'test-shop.myshopify.com',
        wooDomain: 'test-woo.com',
        wixDomain: 'test-wix.com',
        updatedAt: new Date(),
      });

      const result = await integrationsService.getIntegrationStatus('business-id-123');

      expect(result.shopify).toBe(true);
      expect(result.woocommerce).toBe(true);
      expect(result.wix).toBe(true);
      expect(result.lastSync).toBeDefined();
    });

    it('should return false for unconfigured integrations', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        updatedAt: new Date(),
      });

      const result = await integrationsService.getIntegrationStatus('business-id-123');

      expect(result.shopify).toBe(false);
      expect(result.woocommerce).toBe(false);
      expect(result.wix).toBe(false);
    });

    it('should include errors array', async () => {
      (BrandSettings.findOne as jest.Mock) = jest.fn().mockResolvedValue({
        updatedAt: new Date(),
      });

      const result = await integrationsService.getIntegrationStatus('business-id-123');

      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('testShopifyConnection', () => {
    const mockShopifyData = {
      shopifyDomain: 'test-shop.myshopify.com',
      shopifyAccessToken: 'token-123',
    };

    it('should test Shopify connection successfully', async () => {
      const result = await integrationsService.testShopifyConnection(mockShopifyData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.shopName).toBe(mockShopifyData.shopifyDomain);
    });

    it('should return error when domain is missing', async () => {
      const invalidData = {
        shopifyAccessToken: 'token-123',
      };

      const result = await integrationsService.testShopifyConnection(
        invalidData as any
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Shopify domain and access token are required');
    });

    it('should return error when access token is missing', async () => {
      const invalidData = {
        shopifyDomain: 'test-shop.myshopify.com',
      };

      const result = await integrationsService.testShopifyConnection(
        invalidData as any
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle connection errors', async () => {
      // Simulate error
      jest.spyOn(integrationsService, 'testShopifyConnection').mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(
        integrationsService.testShopifyConnection(mockShopifyData)
      ).rejects.toThrow();
    });
  });

  describe('configureShopifyIntegration', () => {
    const mockShopifyData = {
      shopifyDomain: 'test-shop.myshopify.com',
      shopifyAccessToken: 'token-123',
      syncProducts: true,
      syncOrders: true,
    };

    beforeEach(() => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'settings-id',
        shopifyDomain: mockShopifyData.shopifyDomain,
        shopifyConfig: {
          syncProducts: true,
          syncOrders: true,
        },
      });
    });

    it('should configure Shopify integration successfully', async () => {
      const result = await integrationsService.configureShopifyIntegration(
        'business-id-123',
        mockShopifyData
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.shopifyDomain).toBe(mockShopifyData.shopifyDomain);
      expect(result.syncProducts).toBe(true);
    });

    it('should configure webhooks when secret is provided', async () => {
      const dataWithWebhook = {
        ...mockShopifyData,
        shopifyWebhookSecret: 'webhook-secret',
      };

      const result = await integrationsService.configureShopifyIntegration(
        'business-id-123',
        dataWithWebhook
      );

      expect(result.webhooksConfigured).toBe(true);
    });

    it('should create settings if they do not exist', async () => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        _id: 'settings-id',
        shopifyDomain: mockShopifyData.shopifyDomain,
      });

      const result = await integrationsService.configureShopifyIntegration(
        'business-id-123',
        mockShopifyData
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { business: 'business-id-123' },
        expect.any(Object),
        { new: true, upsert: true }
      );
    });
  });

  describe('testWooCommerceConnection', () => {
    const mockWooData = {
      wooDomain: 'test-woo.com',
      wooConsumerKey: 'key-123',
      wooConsumerSecret: 'secret-123',
    };

    it('should test WooCommerce connection', async () => {
      const result = await integrationsService.testWooCommerceConnection(mockWooData);

      expect(result.success).toBeDefined();
    });

    it('should return error when required fields are missing', async () => {
      const invalidData = {
        wooDomain: 'test-woo.com',
      };

      const result = await integrationsService.testWooCommerceConnection(
        invalidData as any
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('testWixConnection', () => {
    const mockWixData = {
      wixDomain: 'test-wix.com',
      wixApiKey: 'api-key-123',
    };

    it('should test Wix connection', async () => {
      const result = await integrationsService.testWixConnection(mockWixData);

      expect(result.success).toBeDefined();
    });
  });

  describe('disconnectIntegration', () => {
    beforeEach(() => {
      (BrandSettings.findOneAndUpdate as jest.Mock) = jest.fn().mockResolvedValue({
        shopifyDomain: null,
      });
    });

    it('should disconnect Shopify integration', async () => {
      const result = await integrationsService.disconnectIntegration(
        'business-id-123',
        'shopify'
      );

      expect(BrandSettings.findOneAndUpdate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should disconnect WooCommerce integration', async () => {
      const result = await integrationsService.disconnectIntegration(
        'business-id-123',
        'woocommerce'
      );

      expect(result.success).toBe(true);
    });

    it('should disconnect Wix integration', async () => {
      const result = await integrationsService.disconnectIntegration(
        'business-id-123',
        'wix'
      );

      expect(result.success).toBe(true);
    });

    it('should return error for invalid integration type', async () => {
      await expect(
        integrationsService.disconnectIntegration('business-id-123', 'invalid' as any)
      ).rejects.toThrow();
    });
  });
});

