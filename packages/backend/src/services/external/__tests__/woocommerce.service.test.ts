// src/services/external/__tests__/woocommerce.service.test.ts

// Set environment variables before importing the service
process.env.APP_URL = 'https://test.ordira.com';

import { WooCommerceService } from '../woocommerce.service';
import { BrandSettings } from '../../../models/brandSettings.model';
import { CertificateService } from '../../business/certificate.service';
import { NftService } from '../../blockchain/nft.service';
// import { NotificationsService } from '../../business/notifications.service';
import { AnalyticsBusinessService } from '../../business/analytics.service';
import { MediaService } from '../../business/media.service';
import axios from 'axios';

// Mock dependencies
jest.mock('../../../models/brandSettings.model');
jest.mock('../../business/certificate.service');
jest.mock('../../blockchain/nft.service');
// jest.mock('../../business/notifications.service');
jest.mock('../../business/analytics.service');
jest.mock('../../business/media.service');
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
const MockedNftService = NftService as jest.MockedClass<typeof NftService>;
// const MockedNotificationsService = NotificationsService as jest.MockedClass<typeof NotificationsService>;
const MockedAnalyticsService = AnalyticsBusinessService as jest.MockedClass<typeof AnalyticsBusinessService>;
const MockedMediaService = MediaService as jest.MockedClass<typeof MediaService>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('WooCommerceService', () => {
  let wooCommerceService: WooCommerceService;
  let mockBrandSettings: any;
  let mockCertificateService: any;
  let mockNftService: any;

  beforeEach(() => {
    wooCommerceService = new WooCommerceService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock brand settings
    mockBrandSettings = {
      _id: 'brand-settings-id-123',
      business: 'business-id-123',
      wooDomain: 'https://test-store.com',
      wooConsumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
      wooConsumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef',
      wooConnectedAt: new Date('2023-12-01T10:00:00.000Z'),
      wooLastSync: new Date('2023-12-01T10:00:00.000Z'),
      wooSettings: {
        version: 'wc/v3',
        verifySsl: true,
        webhooksRegistered: 4,
        lastConnectionTest: new Date('2023-12-01T10:00:00.000Z')
      },
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock certificate service
    mockCertificateService = {
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

    // Mock NFT service
    mockNftService = {
      mintNft: jest.fn().mockResolvedValue({
        tokenId: '123',
        txHash: '0x123abc',
        contractAddress: '0x456def',
        transferScheduled: false
      })
    };

    // Mock axios
    mockAxios.post.mockResolvedValue({
      data: { id: 'webhook-123' },
      status: 201
    });

  });

  describe('Integration Setup', () => {
    describe('generateInstallUrl', () => {
      it('should generate correct WooCommerce install URL', async () => {
        const businessId = 'business-id-123';
        const result = await wooCommerceService.generateInstallUrl(businessId);

        expect(result).toContain('https://test.ordira.com');
        expect(result).toContain('/settings/integrations/woocommerce');
        expect(result).toContain('businessId=');
      });
    });

    describe('setupIntegration', () => {
      it('should setup WooCommerce integration successfully', async () => {
        const businessId = 'business-id-123';
        const integrationData = {
          wooDomain: 'https://test-store.com',
          wooConsumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
          wooConsumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef',
          apiVersion: 'wc/v3',
          syncInterval: 60,
          autoMintOnPurchase: true
        };

        // Mock successful API test
        mockAxios.get.mockResolvedValueOnce({
          data: { name: 'Test Store', url: 'https://test-store.com' },
          status: 200
        });

        // Mock webhook registration
        mockAxios.post
          .mockResolvedValueOnce({ data: { id: 'webhook-1' }, status: 201 })
          .mockResolvedValueOnce({ data: { id: 'webhook-2' }, status: 201 })
          .mockResolvedValueOnce({ data: { id: 'webhook-3' }, status: 201 });

        MockedBrandSettings.findOneAndUpdate.mockResolvedValue(mockBrandSettings);

        const result = await wooCommerceService.setupIntegration(businessId, {
          domain: integrationData.wooDomain,
          consumerKey: integrationData.wooConsumerKey,
          consumerSecret: integrationData.wooConsumerSecret,
          version: integrationData.apiVersion
        });

        expect(result.connected).toBe(true);
        expect(result.domain).toBe(integrationData.wooDomain);
        expect(result.webhooksRegistered).toBeGreaterThan(0);
        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: businessId },
          expect.objectContaining({
            wooDomain: integrationData.wooDomain,
            wooConsumerKey: integrationData.wooConsumerKey,
            wooConsumerSecret: integrationData.wooConsumerSecret
          }),
          { upsert: true, new: true }
        );
      });

      it('should validate WooCommerce credentials', async () => {
        const businessId = 'business-id-123';
        const integrationData = {
          wooDomain: 'https://test-store.com',
          wooConsumerKey: 'invalid_key',
          wooConsumerSecret: 'invalid_secret',
          apiVersion: 'wc/v3'
        };

        // Mock API test failure
        mockAxios.get.mockRejectedValueOnce({
          response: {
            data: { message: 'Invalid credentials' },
            status: 401
          }
        });

        await expect(wooCommerceService.setupIntegration(businessId, {
          domain: integrationData.wooDomain,
          consumerKey: integrationData.wooConsumerKey,
          consumerSecret: integrationData.wooConsumerSecret
        }))
          .rejects.toThrow('Invalid WooCommerce credentials');
      });

      it('should validate domain format', async () => {
        const businessId = 'business-id-123';
        const integrationData = {
          wooDomain: 'invalid-domain',
          wooConsumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
          wooConsumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef'
        };

        await expect(wooCommerceService.setupIntegration(businessId, {
          domain: integrationData.wooDomain,
          consumerKey: integrationData.wooConsumerKey,
          consumerSecret: integrationData.wooConsumerSecret
        }))
          .rejects.toMatchObject({
            statusCode: 400,
            code: 'INVALID_CREDENTIALS'
          });
      });

      it('should validate consumer key format', async () => {
        const businessId = 'business-id-123';
        const integrationData = {
          wooDomain: 'https://test-store.com',
          wooConsumerKey: 'invalid_key_format',
          wooConsumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef'
        };

        // Mock API test failure for invalid key
        mockAxios.get.mockRejectedValueOnce({
          response: {
            data: { message: 'Invalid consumer key' },
            status: 401
          }
        });

        await expect(wooCommerceService.setupIntegration(businessId, {
          domain: integrationData.wooDomain,
          consumerKey: integrationData.wooConsumerKey,
          consumerSecret: integrationData.wooConsumerSecret
        }))
          .rejects.toMatchObject({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS'
          });
      });

      it('should validate consumer secret format', async () => {
        const businessId = 'business-id-123';
        const integrationData = {
          wooDomain: 'https://test-store.com',
          wooConsumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
          wooConsumerSecret: 'invalid_secret_format'
        };

        // Mock API test failure for invalid secret
        mockAxios.get.mockRejectedValueOnce({
          response: {
            data: { message: 'Invalid consumer secret' },
            status: 401
          }
        });

        await expect(wooCommerceService.setupIntegration(businessId, {
          domain: integrationData.wooDomain,
          consumerKey: integrationData.wooConsumerKey,
          consumerSecret: integrationData.wooConsumerSecret
        }))
          .rejects.toMatchObject({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS'
          });
      });
    });
  });

  describe('Webhook Management', () => {
    describe('registerWebhook', () => {
      it('should register webhook successfully', async () => {
        const businessId = 'business-id-123';
        const webhookConfig = {
          name: 'Test Webhook',
          topic: 'order.created',
          deliveryUrl: 'https://test.ordira.com/api/woocommerce/webhook'
        };

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.post.mockResolvedValueOnce({
          data: { id: 123 },
          status: 201
        });

        const result = await wooCommerceService.registerWebhook(businessId, webhookConfig);

        expect(result.registered).toBe(true);
        expect(result.webhookId).toBe(123);
      });

      it('should handle webhook registration failure', async () => {
        const businessId = 'business-id-123';
        const webhookConfig = {
          name: 'Test Webhook',
          topic: 'order.created',
          deliveryUrl: 'https://test.ordira.com/api/woocommerce/webhook'
        };

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.post.mockRejectedValueOnce({
          response: {
            data: { message: 'Invalid webhook' },
            status: 400
          }
        });

        await expect(wooCommerceService.registerWebhook(businessId, webhookConfig))
          .rejects.toMatchObject({
            statusCode: 500,
            code: 'WEBHOOK_REGISTRATION_FAILED'
          });
      });
    });

    describe('removeWebhook', () => {
      it('should remove webhook successfully', async () => {
        const businessId = 'business-id-123';
        const webhookId = '123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.delete.mockResolvedValueOnce({
          data: {},
          status: 200
        });

        const result = await wooCommerceService.removeWebhook(businessId, webhookId);

        expect(result.removed).toBe(true);
      });
    });
  });

  describe('Product Synchronization', () => {
    describe('syncProducts', () => {
      it('should sync products from WooCommerce', async () => {
        const businessId = 'business-id-123';
        const mockProducts = [
          {
            id: 1,
            name: 'Test Product 1',
            slug: 'test-product-1',
            sku: 'PROD-001',
            price: '29.99',
            regular_price: '29.99',
            stock_quantity: 100,
            images: [
              {
                id: 1,
                src: 'https://example.com/image1.jpg'
              }
            ]
          },
          {
            id: 2,
            name: 'Test Product 2',
            slug: 'test-product-2',
            sku: 'PROD-002',
            price: '39.99',
            regular_price: '39.99',
            stock_quantity: 50,
            images: [
              {
                id: 2,
                src: 'https://example.com/image2.jpg'
              }
            ]
          }
        ];

        // Mock brand settings
        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock WooCommerce API response
        mockAxios.get.mockResolvedValueOnce({
          data: mockProducts,
          status: 200
        });

        const result = await wooCommerceService.syncProducts(businessId);

        expect(result.synced).toBe(2);
        expect(result.errors).toHaveLength(0);
        expect(mockAxios.get).toHaveBeenCalledWith(
          `${mockBrandSettings.wooDomain}/wp-json/wc/v3/products`,
          expect.objectContaining({
            auth: {
              username: mockBrandSettings.wooConsumerKey,
              password: mockBrandSettings.wooConsumerSecret
            }
          })
        );
      });

      it('should handle API errors during product sync', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock API error
        mockAxios.get.mockRejectedValueOnce({
          response: {
            data: { message: 'Unauthorized' },
            status: 401
          }
        });

        await expect(wooCommerceService.syncProducts(businessId))
          .rejects.toMatchObject({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS'
          });
      });

      it('should handle missing brand settings', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(null);

        await expect(wooCommerceService.syncProducts(businessId))
          .rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_CONNECTED'
          });
      });
    });
  });

  describe('Order Synchronization', () => {
    describe('syncOrders', () => {
      it('should sync orders from WooCommerce', async () => {
        const businessId = 'business-id-123';
        const mockOrders = [
          {
            id: 1,
            status: 'completed',
            billing: {
              email: 'customer1@example.com',
              first_name: 'John',
              last_name: 'Doe'
            },
            line_items: [
              {
                id: 1,
                name: 'Test Product',
                sku: 'PROD-123',
                quantity: 1,
                price: 29.99
              }
            ],
            total: '29.99',
            currency: 'USD',
            date_created: '2023-12-01T10:00:00'
          }
        ];

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.get.mockResolvedValueOnce({
          data: mockOrders,
          status: 200
        });

        (wooCommerceService as any).certificateService = mockCertificateService;

        const result = await wooCommerceService.syncOrders(businessId);

        expect(result.synced).toBe(1);
        expect(result.errors).toHaveLength(0);
        expect(mockCertificateService.createCertificate).toHaveBeenCalledTimes(1);
      });

      it('should handle orders without certificates', async () => {
        const businessId = 'business-id-123';
        const mockOrders = [
          {
            id: 1,
            status: 'completed',
            billing: {
              email: 'customer1@example.com'
            },
            line_items: [
              {
                id: 1,
                name: 'Product Without SKU',
                quantity: 1,
                price: 29.99
              }
            ]
          }
        ];

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.get.mockResolvedValueOnce({
          data: mockOrders,
          status: 200
        });

        (wooCommerceService as any).certificateService = mockCertificateService;

        const result = await wooCommerceService.syncOrders(businessId);

        expect(result.synced).toBe(0);
        expect(result.errors).toContain('Item "Product Without SKU" has no SKU - skipped certificate creation');
      });
    });
  });

  describe('Connection Management', () => {
    describe('getConnectionStatus', () => {
      it('should get connection status successfully', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        const result = await wooCommerceService.getConnectionStatus(businessId);

        expect(result.connected).toBe(true);
        expect(result.domain).toBe(mockBrandSettings.wooDomain);
        expect(result.features).toBeDefined();
      });

      it('should handle missing connection configuration', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(null);

        const result = await wooCommerceService.getConnectionStatus(businessId);

        expect(result.connected).toBe(false);
      });
    });

    describe('getWebhookStatus', () => {
      it('should get webhook status successfully', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        mockAxios.get.mockResolvedValueOnce({
          data: [
            { id: 1, name: 'Ordira Order Created', status: 'active' },
            { id: 2, name: 'Ordira Order Updated', status: 'active' }
          ],
          status: 200
        });

        const result = await wooCommerceService.getWebhookStatus(businessId);

        expect(result.total).toBeGreaterThan(0);
        expect(result.health).toBeDefined();
      });
    });
  });

  describe('Integration Management', () => {
    describe('setupIntegration', () => {
      it('should handle setup with missing brand settings', async () => {
        const businessId = 'business-id-123';
        const credentials = {
          domain: 'https://test-store.com',
          consumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
          consumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef',
          apiVersion: 'wc/v3',
          syncInterval: 60,
          autoMintOnPurchase: true
        };

        // Mock successful API test
        mockAxios.get.mockResolvedValueOnce({
          data: { name: 'Test Store', url: 'https://test-store.com' },
          status: 200
        });

        // Mock brand settings not found initially
        MockedBrandSettings.findOne.mockResolvedValueOnce(null);
        MockedBrandSettings.findOneAndUpdate.mockResolvedValue(mockBrandSettings);

        const result = await wooCommerceService.setupIntegration(businessId, credentials);

        expect(result.connected).toBe(true);
        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: businessId },
          expect.objectContaining({
            wooDomain: credentials.domain,
            wooConsumerKey: credentials.consumerKey,
            wooConsumerSecret: credentials.consumerSecret
          }),
          { upsert: true, new: true }
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const businessId = 'business-id-123';

      MockedBrandSettings.findOne.mockResolvedValue(null);

      await expect(wooCommerceService.syncProducts(businessId))
        .rejects.toMatchObject({
          statusCode: 404,
          code: 'NOT_CONNECTED'
        });
    });

    it('should handle invalid webhook configuration', async () => {
      const businessId = 'business-id-123';
      const webhookConfig = {
        name: 'Test Webhook',
        topic: 'order.created',
        deliveryUrl: 'https://test.ordira.com/api/woocommerce/webhook'
      };

      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
      mockAxios.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Webhook registration failed' },
          status: 500
        }
      });

      await expect(wooCommerceService.registerWebhook(businessId, webhookConfig))
        .rejects.toMatchObject({
          statusCode: 500,
          code: 'WEBHOOK_REGISTRATION_FAILED'
        });
    });

    it('should handle missing environment variables', async () => {
      const originalAppUrl = process.env.APP_URL;
      delete process.env.APP_URL;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      const { WooCommerceService: NewWooCommerceService } = require('../woocommerce.service');
      const newWooCommerceService = new NewWooCommerceService();

      const businessId = 'business-id-123';
      
      await expect(newWooCommerceService.generateInstallUrl(businessId))
        .rejects.toMatchObject({
          statusCode: 500,
          code: 'MISSING_CONFIG'
        });

      process.env.APP_URL = originalAppUrl;
    });
  });
});
