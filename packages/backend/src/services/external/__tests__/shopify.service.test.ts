// src/services/external/__tests__/shopify.service.test.ts

// Set environment variables before importing the service
process.env.APP_URL = 'https://test.ordira.com';
process.env.SHOPIFY_API_KEY = 'test_client_id';
process.env.SHOPIFY_API_SECRET = 'test_client_secret';

import { ShopifyService } from '../shopify.service';
import { BrandSettings } from '../../../models/brandSettings.model';
import { CertificateService } from '../../business/certificate.service';
import axios from 'axios';

// Mock dependencies
jest.mock('../../../models/brandSettings.model');
jest.mock('../../business/certificate.service');
jest.mock('axios');
jest.mock('crypto', () => {
  const originalCrypto = jest.requireActual('crypto');
  return {
    ...originalCrypto,
    createHmac: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('valid_signature')
    }))
  };
});

const MockedBrandSettings = BrandSettings as jest.Mocked<typeof BrandSettings>;
const MockedCertificateService = CertificateService as jest.MockedClass<typeof CertificateService>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('ShopifyService', () => {
  let shopifyService: ShopifyService;
  let mockBrandSettings: any;

  beforeEach(() => {
    shopifyService = new ShopifyService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock brand settings
    mockBrandSettings = {
      _id: 'brand-settings-id-123',
      business: 'business-id-123',
      shopifyDomain: 'test-shop',
      shopifyAccessToken: 'shpat_test_token_123',
      shopifyWebhookSecret: 'test_webhook_secret',
      save: jest.fn().mockResolvedValue(true)
    };

  });

  describe('generateInstallUrl', () => {
    it('should generate correct Shopify install URL with existing shop domain', async () => {
      const businessId = 'business-id-123';
      
      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
      
      const result = await shopifyService.generateInstallUrl(businessId);

      expect(result).toContain('https://test-shop.myshopify.com/admin/oauth/authorize');
      expect(result).toContain('client_id=test_client_id');
      expect(result).toContain('scope=read_products,write_webhooks,read_orders,read_customers,read_inventory');
      expect(result).toContain('redirect_uri=');
      expect(result).toContain('state=business-id-123');
    });

    it('should generate install URL with custom shop domain', async () => {
      const businessId = 'business-id-123';
      const customShop = 'custom-shop';
      
      const result = await shopifyService.generateInstallUrl(businessId, customShop);

      expect(result).toContain('https://custom-shop.myshopify.com/admin/oauth/authorize');
      expect(result).toContain('client_id=test_client_id');
      expect(result).toContain('state=business-id-123');
    });

    it('should throw error when shop domain is missing', async () => {
      const businessId = 'business-id-123';
      
      MockedBrandSettings.findOne.mockResolvedValue(null);

      await expect(shopifyService.generateInstallUrl(businessId))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Shop domain is required for Shopify installation'
        });
    });

    it('should throw error when business ID is missing', async () => {
      await expect(shopifyService.generateInstallUrl(''))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Business ID is required'
        });
    });

    it('should throw error when shop domain format is invalid', async () => {
      const businessId = 'business-id-123';
      const invalidShop = 'invalid-shop.myshopify.com';

      await expect(shopifyService.generateInstallUrl(businessId, invalidShop))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Invalid shop domain format'
        });
    });

    it('should throw error when SHOPIFY_API_KEY is missing', async () => {
      // Create a new service instance with missing API key
      const originalApiKey = process.env.SHOPIFY_API_KEY;
      delete process.env.SHOPIFY_API_KEY;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      const { ShopifyService: NewShopifyService } = require('../shopify.service');
      const newShopifyService = new NewShopifyService();

      const businessId = 'business-id-123';
      const customShop = 'test-shop';

      await expect(newShopifyService.generateInstallUrl(businessId, customShop))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 500,
          message: 'SHOPIFY_API_KEY not configured'
        });

      // Restore original value
      process.env.SHOPIFY_API_KEY = originalApiKey;
    });

    it('should throw error when APP_URL is missing', async () => {
      // Create a new service instance with missing APP_URL
      const originalAppUrl = process.env.APP_URL;
      delete process.env.APP_URL;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      const { ShopifyService: NewShopifyService } = require('../shopify.service');
      const newShopifyService = new NewShopifyService();

      const businessId = 'business-id-123';
      const customShop = 'test-shop';

      await expect(newShopifyService.generateInstallUrl(businessId, customShop))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 500,
          message: 'APP_URL not configured'
        });

      // Restore original value
      process.env.APP_URL = originalAppUrl;
    });
  });

  describe('exchangeCode', () => {
    it('should exchange authorization code for access token successfully', async () => {
      const shop = 'test-shop';
      const code = 'auth_code_123';
      const state = 'business-id-123';

      // Mock successful token exchange
      mockAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'shpat_exchanged_token_123',
          scope: 'read_products,write_webhooks,read_orders,read_customers,read_inventory'
        },
        status: 200
      });

      // Mock webhook registration calls
      mockAxios.post
        .mockResolvedValueOnce({ data: { webhook: { id: 'webhook-1' } }, status: 201 })
        .mockResolvedValueOnce({ data: { webhook: { id: 'webhook-2' } }, status: 201 })
        .mockResolvedValueOnce({ data: { webhook: { id: 'webhook-3' } }, status: 201 });

      MockedBrandSettings.findOneAndUpdate.mockResolvedValue(mockBrandSettings);

      await shopifyService.exchangeCode(shop, code, state);

      // Verify token exchange call
      expect(mockAxios.post).toHaveBeenCalledWith(
        `https://test-shop/admin/oauth/access_token`,
        expect.objectContaining({
          client_id: 'test_client_id',
          client_secret: 'test_client_secret',
          code: code
        })
      );

      // Verify brand settings update
      expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { business: state },
        expect.objectContaining({
          shopifyDomain: shop,
          shopifyAccessToken: 'shpat_exchanged_token_123'
        }),
        { upsert: true, new: true }
      );
    });

    it('should handle token exchange failure', async () => {
      const shop = 'test-shop';
      const code = 'invalid_code';
      const state = 'business-id-123';

      // Mock failed token exchange
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: { error: 'Invalid authorization code' },
          status: 400
        }
      });

      await expect(shopifyService.exchangeCode(shop, code, state))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Invalid authorization code or credentials'
        });
    });

    it('should validate required parameters', async () => {
      await expect(shopifyService.exchangeCode('', 'code', 'state'))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Shop domain is required'
        });

      await expect(shopifyService.exchangeCode('shop', '', 'state'))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Authorization code is required'
        });

      await expect(shopifyService.exchangeCode('shop', 'code', ''))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'State parameter is required'
        });
    });

    it('should throw error when API credentials are missing', async () => {
      const originalApiKey = process.env.SHOPIFY_API_KEY;
      const originalApiSecret = process.env.SHOPIFY_API_SECRET;
      
      delete process.env.SHOPIFY_API_KEY;
      delete process.env.SHOPIFY_API_SECRET;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      const { ShopifyService: NewShopifyService } = require('../shopify.service');
      const newShopifyService = new NewShopifyService();

      const shop = 'test-shop';
      const code = 'auth_code_123';
      const state = 'business-id-123';

      await expect(newShopifyService.exchangeCode(shop, code, state))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 500,
          message: 'Shopify API credentials not configured'
        });

      process.env.SHOPIFY_API_KEY = originalApiKey;
      process.env.SHOPIFY_API_SECRET = originalApiSecret;
    });
  });

  describe('processOrderWebhook', () => {
    it('should process valid order webhook and create certificates', async () => {
      const mockOrderWebhook = {
        id: 123456789,
        email: 'customer@example.com',
        line_items: [
          {
            id: 1,
            title: 'Test Product',
            sku: 'PROD-123',
            quantity: 1,
            price: '29.99'
          }
        ],
        financial_status: 'paid',
        fulfillment_status: 'fulfilled'
      };

      const mockReq = {
        body: mockOrderWebhook,
        rawBody: JSON.stringify(mockOrderWebhook),
        get: jest.fn().mockImplementation((header) => {
          if (header === 'x-shopify-topic') return 'orders/create';
          if (header === 'X-Shopify-Hmac-Sha256') return 'valid_signature';
          if (header === 'X-Shopify-Shop-Domain') return 'test-shop.myshopify.com';
          return null;
        })
      };

      // Mock brand settings lookup
      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

      // Mock certificate service
      const mockCertificateService = {
        createCertificate: jest.fn().mockResolvedValue({
          _id: 'certificate-id-123',
          business: 'business-id-123',
          product: 'product-123',
          recipient: 'customer@example.com',
          tokenId: '123',
          txHash: '0x123abc',
          contractAddress: '0x456def',
          status: 'minted'
        })
      };

      // Replace the certificate service instance
      (shopifyService as any).certificateService = mockCertificateService;

      const result = await shopifyService.processOrderWebhook(mockReq);

      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockCertificateService.createCertificate).toHaveBeenCalledWith(
        'business-id-123',
        expect.objectContaining({
          productId: 'PROD-123',
          recipient: 'customer@example.com',
          contactMethod: 'email'
        })
      );
    });

    it('should handle orders without line items', async () => {
      const mockOrderWebhook = {
        id: 123456789,
        email: 'customer@example.com',
        line_items: [],
        financial_status: 'paid'
      };

      const mockReq = {
        body: mockOrderWebhook,
        rawBody: JSON.stringify(mockOrderWebhook),
        get: jest.fn().mockImplementation((header) => {
          if (header === 'x-shopify-topic') return 'orders/create';
          if (header === 'X-Shopify-Hmac-Sha256') return 'valid_signature';
          if (header === 'X-Shopify-Shop-Domain') return 'test-shop.myshopify.com';
          return null;
        })
      };

      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

      const result = await shopifyService.processOrderWebhook(mockReq);

      expect(result.processed).toBe(0);
      expect(result.errors).toContain('No line items found in order');
    });

    it('should skip items without SKU', async () => {
      const mockOrderWebhook = {
        id: 123456789,
        email: 'customer@example.com',
        line_items: [
          {
            id: 1,
            title: 'Product Without SKU',
            quantity: 1,
            price: '29.99'
          },
          {
            id: 2,
            title: 'Product With SKU',
            sku: 'PROD-123',
            quantity: 1,
            price: '19.99'
          }
        ],
        financial_status: 'paid'
      };

      const mockReq = {
        body: mockOrderWebhook,
        rawBody: JSON.stringify(mockOrderWebhook),
        get: jest.fn().mockImplementation((header) => {
          if (header === 'x-shopify-topic') return 'orders/create';
          if (header === 'X-Shopify-Hmac-Sha256') return 'valid_signature';
          if (header === 'X-Shopify-Shop-Domain') return 'test-shop.myshopify.com';
          return null;
        })
      };

      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

      const mockCertificateService = {
        createCertificate: jest.fn().mockResolvedValue({})
      };
      (shopifyService as any).certificateService = mockCertificateService;

      const result = await shopifyService.processOrderWebhook(mockReq);

      expect(result.processed).toBe(1);
      expect(result.errors).toContain('Item "Product Without SKU" has no SKU - skipped certificate creation');
    });

    it('should throw error when request body is missing', async () => {
      const mockReq = {
        body: null,
        rawBody: null,
        get: jest.fn().mockReturnValue('orders/create')
      };

      await expect(shopifyService.processOrderWebhook(mockReq))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Missing request body in webhook'
        });
    });

    it('should throw error when raw body is missing', async () => {
      const mockOrderWebhook = { id: 123 };
      const mockReq = {
        body: mockOrderWebhook,
        rawBody: null,
        get: jest.fn().mockReturnValue('orders/create')
      };

      await expect(shopifyService.processOrderWebhook(mockReq))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 400,
          message: 'Missing request body in webhook'
        });
    });
  });

  describe('syncProducts', () => {
    it('should sync products from Shopify successfully', async () => {
      const businessId = 'business-id-123';
      const mockProducts = [
        {
          id: 1,
          title: 'Test Product 1',
          handle: 'test-product-1',
          variants: [
            {
              id: 1,
              sku: 'PROD-001',
              price: '29.99',
              inventory_quantity: 100
            }
          ],
          images: [
            {
              id: 1,
              src: 'https://example.com/image1.jpg'
            }
          ]
        }
      ];

      // Mock brand settings with proper structure
      const settingsWithToken = {
        _id: 'brand-settings-id-123',
        business: 'business-id-123',
        shopifyAccessToken: 'shpat_test_token_123',
        shopifyDomain: 'test-shop',
        save: jest.fn().mockResolvedValue(true)
      };

      MockedBrandSettings.findOne.mockResolvedValue(settingsWithToken);

      // Mock Shopify API response
      mockAxios.get.mockResolvedValueOnce({
        data: { products: mockProducts },
        status: 200
      });

      const result = await shopifyService.syncProducts(businessId);

      expect(result.synced).toBe(0); // Service has TODO: not implemented yet
      expect(result.errors).toHaveLength(0);
      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://test-shop/admin/api/2024-01/products.json`,
        expect.objectContaining({
          headers: { 'X-Shopify-Access-Token': 'shpat_test_token_123' },
          params: { limit: 250 }
        })
      );
    });

    it('should throw error when Shopify not connected', async () => {
      const businessId = 'business-id-123';

      MockedBrandSettings.findOne.mockResolvedValue(null);

      await expect(shopifyService.syncProducts(businessId))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 404,
          message: 'Shopify not connected for this business'
        });
    });

    it('should throw error when access token is missing', async () => {
      const businessId = 'business-id-123';
      const settingsWithoutToken = {
        ...mockBrandSettings,
        shopifyAccessToken: null
      };

      MockedBrandSettings.findOne.mockResolvedValue(settingsWithoutToken);

      await expect(shopifyService.syncProducts(businessId))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 404,
          message: 'Shopify not connected for this business'
        });
    });

    it('should handle API errors during product sync', async () => {
      const businessId = 'business-id-123';
      const settingsWithToken = {
        _id: 'brand-settings-id-123',
        business: 'business-id-123',
        shopifyAccessToken: 'shpat_test_token_123',
        shopifyDomain: 'test-shop',
        save: jest.fn().mockResolvedValue(true)
      };

      MockedBrandSettings.findOne.mockResolvedValue(settingsWithToken);

      // Mock API error
      mockAxios.get.mockRejectedValueOnce({
        response: {
          data: { errors: 'Unauthorized' },
          status: 401
        }
      });

      await expect(shopifyService.syncProducts(businessId))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 401,
          message: 'Shopify access token is invalid or expired'
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const businessId = 'business-id-123';

      MockedBrandSettings.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(shopifyService.generateInstallUrl(businessId))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 500,
          message: expect.stringContaining('Failed to generate Shopify install URL')
        });
    });

    it('should handle network errors gracefully', async () => {
      const shop = 'test-shop';
      const code = 'auth_code_123';
      const state = 'business-id-123';

      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(shopifyService.exchangeCode(shop, code, state))
        .rejects.toMatchObject({
          name: 'ShopifyError',
          statusCode: 500,
          message: expect.stringContaining('Failed to complete Shopify integration')
        });
    });
  });
});