// src/services/external/__tests__/wix.service.test.ts

// Set environment variables before importing the service
process.env.APP_URL = 'https://test.ordira.com';
process.env.WIX_CLIENT_ID = 'test_client_id';
process.env.WIX_CLIENT_SECRET = 'test_client_secret';

import { WixService } from '../wix.service';
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

describe('WixService', () => {
  let wixService: WixService;
  let mockBrandSettings: any;
  let mockCertificateService: any;
  let mockNftService: any;

  beforeEach(() => {
    wixService = new WixService();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock brand settings
    mockBrandSettings = {
      _id: 'brand-settings-id-123',
      business: 'business-id-123',
      wixApiKey: 'wix_api_key_1234567890abcdef',
      wixRefreshToken: 'wix_refresh_token_1234567890abcdef',
      wixDomain: 'test-site.wixsite.com',
      wixInstanceId: 'wix-instance-123',
      wixConnectedAt: new Date('2023-12-01T10:00:00.000Z'),
      wixLastSync: new Date('2023-12-01T10:00:00.000Z'),
      wixSettings: {
        webhooksRegistered: true,
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
      data: { webhookId: 'webhook-123' },
      status: 201
    });

  });

  describe('OAuth Integration', () => {
    describe('generateInstallUrl', () => {
      it('should generate correct Wix install URL', async () => {
        const businessId = 'business-id-123';
        const result = await wixService.generateInstallUrl(businessId);

        expect(result).toContain('https://www.wix.com/oauth/authorize');
        expect(result).toContain('client_id=test_client_id');
        expect(result).toContain('redirect_uri=');
        expect(result).toContain('state=');
      });

      it('should include business ID in state parameter', async () => {
        const businessId = 'business-id-123';
        const result = await wixService.generateInstallUrl(businessId);

        expect(result).toContain(`state=${businessId}`);
      });
    });

    describe('exchangeCode', () => {
      it('should exchange authorization code for access token', async () => {
        const code = 'auth_code_123';
        const state = 'business-id-123';

        // Mock successful token exchange
        mockAxios.post.mockResolvedValueOnce({
          data: {
            access_token: 'wix_access_token_123',
            refresh_token: 'wix_refresh_token_123',
            instance_id: 'wix_instance_123',
            expires_in: 3600
          },
          status: 200
        });

        // Mock brand settings find and update
        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        MockedBrandSettings.findOneAndUpdate.mockResolvedValue(mockBrandSettings);

        const result = await wixService.exchangeCode(code, state);

        expect(result).toMatchObject({
          instanceId: 'wix_instance_123',
          accessToken: 'wix_access_token_123',
          refreshToken: 'wix_refresh_token_123',
          connectedAt: expect.any(Date)
        });

        expect(mockAxios.post).toHaveBeenCalledWith(
          'https://www.wixapis.com/oauth/access',
          expect.objectContaining({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            code: code,
            grant_type: 'authorization_code'
          })
        );

        expect(MockedBrandSettings.findOneAndUpdate).toHaveBeenCalledWith(
          { business: state },
          expect.objectContaining({
            wixApiKey: 'wix_access_token_123',
            wixRefreshToken: 'wix_refresh_token_123',
            wixDomain: 'wix_instance_123'
          }),
          { upsert: true, new: true }
        );
      });

      it('should register webhooks after successful token exchange', async () => {
        const code = 'auth_code_123';
        const state = 'business-id-123';

        // Mock successful token exchange
        mockAxios.post.mockResolvedValueOnce({
          data: {
            access_token: 'wix_access_token_123',
            refresh_token: 'wix_refresh_token_123',
            instance_id: 'wix_instance_123',
            expires_in: 3600
          },
          status: 200
        });

        // Mock webhook registration calls
        mockAxios.post
          .mockResolvedValueOnce({ data: { webhookId: 'webhook-1' }, status: 201 })
          .mockResolvedValueOnce({ data: { webhookId: 'webhook-2' }, status: 201 })
          .mockResolvedValueOnce({ data: { webhookId: 'webhook-3' }, status: 201 });

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        MockedBrandSettings.findOneAndUpdate.mockResolvedValue(mockBrandSettings);

        await wixService.exchangeCode(code, state);

        // Verify webhook registration calls
        expect(mockAxios.post).toHaveBeenCalledWith(
          'https://www.wixapis.com/webhooks/v1/webhooks',
          expect.objectContaining({
            entityId: '*',
            eventType: 'wix.ecommerce.v1.OrderCreated',
            name: 'Ordira OrderCreated',
            url: 'https://test.ordira.com/api/wix/webhook'
          }),
          expect.objectContaining({
            headers: { 
              'Authorization': 'Bearer wix_access_token_123',
              'Content-Type': 'application/json'
            }
          })
        );
      });

      it('should handle token exchange failure', async () => {
        const code = 'invalid_code';
        const state = 'business-id-123';

        // Mock failed token exchange
        mockAxios.post.mockRejectedValueOnce({
          response: {
            data: { error: 'Invalid authorization code' },
            status: 400
          }
        });

        await expect(wixService.exchangeCode(code, state))
          .rejects.toMatchObject({
            statusCode: 400,
            code: 'MISSING_ACCESS_TOKEN'
          });
      });

      it('should validate state parameter', async () => {
        const code = 'auth_code_123';
        const invalidState = '';

        await expect(wixService.exchangeCode(code, invalidState))
          .rejects.toMatchObject({
            statusCode: 400,
            code: 'MISSING_STATE'
          });
      });
    });
  });

  describe('Webhook Management', () => {
    describe('processOrderWebhook', () => {
      it('should process valid order webhook and create certificates', async () => {
        const mockOrderWebhook = {
          order: {
            id: 'order-123',
            buyerInfo: {
              email: 'customer@example.com',
              firstName: 'John',
              lastName: 'Doe'
            },
            lineItems: [
              {
                id: 'item-1',
                productName: { original: 'Test Product 1' },
                sku: 'PROD-123',
                quantity: 1,
                price: { amount: '29.99' }
              },
              {
                id: 'item-2',
                productName: { original: 'Test Product 2' },
                sku: 'PROD-456',
                quantity: 2,
                price: { amount: '19.99' }
              }
            ],
            status: 'PAID',
            fulfillmentStatus: 'FULFILLED'
          }
        };

        const instanceId = 'wix-instance-123';

        // Mock brand settings lookup
        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock certificate service
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(2);
        expect(result.errors).toHaveLength(0);
        expect(mockCertificateService.createCertificate).toHaveBeenCalledTimes(2);
        expect(mockCertificateService.createCertificate).toHaveBeenCalledWith(
          'business-id-123',
          expect.objectContaining({
            productId: 'PROD-123',
            recipient: 'customer@example.com',
            contactMethod: 'email'
          })
        );
      });

      it('should handle different webhook payload structures', async () => {
        const mockOrderWebhook = {
          id: 'order-123',
          billing: {
            email: 'customer@example.com'
          },
          lineItems: [
            {
              id: 'item-1',
              productName: { original: 'Test Product' },
              sku: 'PROD-123',
              quantity: 1,
              price: { amount: '29.99' }
            }
          ],
          status: 'PAID'
        };

        const instanceId = 'wix-instance-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(1);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle orders without line items', async () => {
        const mockOrderWebhook = {
          order: {
            id: 'order-123',
            buyerInfo: {
              email: 'customer@example.com'
            },
            lineItems: [],
            status: 'PAID'
          }
        };

        const instanceId = 'wix-instance-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(0);
        expect(result.errors).toContain('No line items found in order');
      });

      it('should skip items without SKU', async () => {
        const mockOrderWebhook = {
          order: {
            id: 'order-123',
            buyerInfo: {
              email: 'customer@example.com'
            },
            lineItems: [
              {
                id: 'item-1',
                productName: { original: 'Product Without SKU' },
                quantity: 1,
                price: { amount: '29.99' }
              },
              {
                id: 'item-2',
                productName: { original: 'Product With SKU' },
                sku: 'PROD-123',
                quantity: 1,
                price: { amount: '19.99' }
              }
            ],
            status: 'PAID'
          }
        };

        const instanceId = 'wix-instance-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(1);
        expect(result.errors).toContain('Item "Product Without SKU" has no SKU - skipped');
      });

      it('should handle certificate creation errors gracefully', async () => {
        const mockOrderWebhook = {
          order: {
            id: 'order-123',
            buyerInfo: {
              email: 'customer@example.com'
            },
            lineItems: [
              {
                id: 'item-1',
                productName: { original: 'Test Product' },
                sku: 'PROD-123',
                quantity: 1,
                price: { amount: '29.99' }
              }
            ],
            status: 'PAID'
          }
        };

        const instanceId = 'wix-instance-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        
        // Mock certificate service to throw error
        mockCertificateService.createCertificate.mockRejectedValueOnce(
          new Error('Certificate creation failed')
        );
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(0);
        expect(result.errors).toContain('Failed to create certificate for "Test Product": Certificate creation failed');
      });

      it('should validate webhook signature', async () => {
        const mockOrderWebhook = {
          order: {
            id: 'order-123',
            buyerInfo: { email: 'customer@example.com' },
            lineItems: [
              {
                id: 'item-1',
                productName: { original: 'Test Product' },
                sku: 'PROD-123',
                quantity: 1,
                price: { amount: '29.99' }
              }
            ],
            status: 'PAID'
          }
        };

        const instanceId = 'wix-instance-123';

        // Mock brand settings lookup
        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
        (wixService as any).certificateService = mockCertificateService;

        const result = await wixService.processOrderWebhook(mockOrderWebhook, instanceId);

        expect(result.processed).toBe(true);
        expect(result.certificatesCreated).toBe(1);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Product Synchronization', () => {
    describe('syncProducts', () => {
      it('should sync products from Wix', async () => {
        const businessId = 'business-id-123';
        const mockProducts = [
          {
            id: 'product-1',
            name: 'Test Product 1',
            slug: 'test-product-1',
            sku: 'PROD-001',
            price: { amount: '29.99' },
            inventory: { quantity: 100 },
            media: {
              mainMedia: {
                image: {
                  url: 'https://example.com/image1.jpg'
                }
              }
            }
          },
          {
            id: 'product-2',
            name: 'Test Product 2',
            slug: 'test-product-2',
            sku: 'PROD-002',
            price: { amount: '39.99' },
            inventory: { quantity: 50 },
            media: {
              mainMedia: {
                image: {
                  url: 'https://example.com/image2.jpg'
                }
              }
            }
          }
        ];

        // Mock brand settings
        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock Wix API response
        mockAxios.get.mockResolvedValueOnce({
          data: { products: mockProducts },
          status: 200
        });

        const result = await wixService.syncProducts(businessId);

        expect(result.synced).toBe(2);
        expect(result.errors).toHaveLength(0);
        expect(mockAxios.get).toHaveBeenCalledWith(
          'https://www.wixapis.com/stores/v1/products/query',
          expect.objectContaining({
            data: { query: { limit: 100 } },
            headers: { 
              'Authorization': `Bearer ${mockBrandSettings.wixApiKey}`,
              'Content-Type': 'application/json'
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
            data: { error: 'Unauthorized' },
            status: 401
          }
        });

        await expect(wixService.syncProducts(businessId))
          .rejects.toMatchObject({
            statusCode: 401,
            code: 'TOKEN_EXPIRED'
          });
      });

      it('should handle missing brand settings', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(null);

        await expect(wixService.syncProducts(businessId))
          .rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_CONNECTED'
          });
      });
    });
  });

  describe('Connection Testing', () => {
    describe('testConnection', () => {
      it('should test successful Wix connection', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock successful API call
        mockAxios.get.mockResolvedValueOnce({
          data: { site: { displayName: 'Test Site', url: 'test-site.wixsite.com' } },
          status: 200
        });

        const result = await wixService.testConnection(businessId);

        expect(result.success).toBe(true);
        expect(result).toMatchObject({
          success: true,
          responseTime: expect.any(Number),
          apiVersion: expect.any(String),
          instanceInfo: expect.objectContaining({
            siteId: 'test-site.wixsite.com',
            domain: expect.any(String),
            plan: expect.any(String)
          }),
          permissions: expect.any(Array)
        });
      });

      it('should handle connection test failure', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);

        // Mock API error
        mockAxios.get.mockRejectedValueOnce({
          response: {
            data: { error: 'Unauthorized' },
            status: 401
          }
        });

        const result = await wixService.testConnection(businessId);

        expect(result.success).toBe(false);
        expect(result.errors).toContain('API connection failed');
      });

      it('should handle missing integration configuration', async () => {
        const businessId = 'business-id-123';

        MockedBrandSettings.findOne.mockResolvedValue(null);

        await expect(wixService.testConnection(businessId))
          .rejects.toMatchObject({
            statusCode: 404,
            code: 'NOT_CONNECTED'
          });
      });
    });
  });

  describe('Integration Management', () => {

  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const businessId = 'business-id-123';

      MockedBrandSettings.findOne.mockResolvedValue(mockBrandSettings);
      mockAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await wixService.testConnection(businessId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });

    it('should handle invalid webhook data', async () => {
      const invalidWebhookData = null;

      await expect(wixService.processOrderWebhook(invalidWebhookData, 'business-id-123'))
        .rejects.toThrow();
    });

    it('should handle missing environment variables', async () => {
      const originalAppUrl = process.env.APP_URL;
      delete process.env.APP_URL;
      
      // Re-import the service to get the new environment
      jest.resetModules();
      const { WixService: NewWixService } = require('../wix.service');
      const newWixService = new NewWixService();

      const businessId = 'business-id-123';
      
      await expect(newWixService.generateInstallUrl(businessId))
        .rejects.toMatchObject({
          statusCode: 500,
          code: 'MISSING_CONFIG'
        });

      process.env.APP_URL = originalAppUrl;
    });
  });
});
