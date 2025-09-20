// src/__tests__/integration/ecommerce-webhooks.integration.test.ts

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BrandSettings } from '../../models/brandSettings.model';
import { Business } from '../../models/business.model';
import { Product } from '../../models/product.model';
import { Certificate } from '../../models/certificate.model';
import { cleanupTestData } from '../../utils/__tests__/testHelpers';
import crypto from 'crypto';

let app: express.Application;
let mongo: MongoMemoryServer;

// Mock the external services to avoid actual API calls
jest.mock('../../services/external/shopify.service');
jest.mock('../../services/external/woocommerce.service');
jest.mock('../../services/external/wix.service');
jest.mock('../../services/blockchain/nft.service');

beforeAll(async () => {
  // Set up test database
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);

  // Set environment variables for JWT and webhooks
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_ISSUER = 'Ordira-api';
  process.env.JWT_AUDIENCE = 'ordira-app';
  process.env.APP_URL = 'https://test.ordira.com';

  // Create Express app with webhook routes
  app = express();
  app.use(express.json());

  // Import and use webhook routes
  const shopifyRoutes = require('../../routes/integrations/shopify.routes');
  const woocommerceRoutes = require('../../routes/integrations/woocommerce.routes');
  const wixRoutes = require('../../routes/integrations/wix.routes');

  app.use('/api/integrations/shopify', shopifyRoutes);
  app.use('/api/integrations/woocommerce', woocommerceRoutes);
  app.use('/api/integrations/wix', wixRoutes);
});

beforeEach(async () => {
  // Clean up test data
  await cleanupTestData();
});

afterAll(async () => {
  // Clean up database connections
  await mongoose.disconnect();
  await mongo.stop();
});

describe('E-commerce Webhook Integration Tests', () => {
  let testBusiness: any;
  let testBrandSettings: any;
  let testProduct: any;

  beforeEach(async () => {
    // Create test business
    testBusiness = await Business.create({
      firstName: 'Test',
      lastName: 'Business',
      dateOfBirth: '1990-01-01',
      email: 'test@business.com',
      phone: '+1234567890',
      businessName: 'Test Business',
      businessType: 'brand',
      address: '123 Test St',
      password: 'TestPass123!',
      isEmailVerified: true,
      isActive: true
    });

    // Create test product
    testProduct = await Product.create({
      business: testBusiness._id,
      name: 'Test Product',
      sku: 'PROD-123',
      description: 'A test product for webhook testing',
      price: 29.99,
      category: 'test',
      isActive: true
    });

    // Create test brand settings with integrations
    testBrandSettings = await BrandSettings.create({
      business: testBusiness._id,
      shopifyIntegration: {
        shopifyDomain: 'test-shop.myshopify.com',
        shopifyAccessToken: 'shpat_test_token_123',
        shopifyWebhookSecret: 'test_webhook_secret',
        syncProducts: true,
        syncOrders: true,
        autoMintOnPurchase: true
      },
      wooCommerceIntegration: {
        wooDomain: 'https://test-store.com',
        wooConsumerKey: 'ck_test_consumer_key_1234567890abcdef1234567890abcdef',
        wooConsumerSecret: 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef',
        apiVersion: 'wc/v3',
        syncInterval: 60,
        autoMintOnPurchase: true
      },
      wixIntegration: {
        wixDomain: 'test-site.wixsite.com',
        wixApiKey: 'wix_api_key_1234567890abcdef',
        wixRefreshToken: 'wix_refresh_token_1234567890abcdef',
        syncProducts: true,
        syncOrders: true,
        autoMintOnPurchase: true
      }
    });
  });

  describe('Shopify Webhooks', () => {
    describe('POST /api/integrations/shopify/webhook/orders/create', () => {
      it('should process Shopify order webhook and create certificates', async () => {
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

        // Generate valid HMAC signature
        const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/shopify/webhook/orders/create')
          .set('X-Shopify-Topic', 'orders/create')
          .set('X-Shopify-Hmac-Sha256', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('processed');
        expect(res.body.processed).toBeGreaterThan(0);

        // Verify certificate was created
        const certificate = await Certificate.findOne({
          business: testBusiness._id,
          product: testProduct._id,
          recipient: 'customer@example.com'
        });

        expect(certificate).not.toBeNull();
        expect(certificate?.status).toBe('minted');
      });

      it('should reject webhook with invalid signature', async () => {
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
          ]
        };

        const res = await request(app)
          .post('/api/integrations/shopify/webhook/orders/create')
          .set('X-Shopify-Topic', 'orders/create')
          .set('X-Shopify-Hmac-Sha256', 'invalid_signature')
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Invalid webhook signature');
      });

      it('should handle orders without line items', async () => {
        const mockOrderWebhook = {
          id: 123456789,
          email: 'customer@example.com',
          line_items: [],
          financial_status: 'paid'
        };

        const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/shopify/webhook/orders/create')
          .set('X-Shopify-Topic', 'orders/create')
          .set('X-Shopify-Hmac-Sha256', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body.processed).toBe(0);
        expect(res.body.errors).toContain('No line items found in order');
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

        const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/shopify/webhook/orders/create')
          .set('X-Shopify-Topic', 'orders/create')
          .set('X-Shopify-Hmac-Sha256', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body.processed).toBe(1);
        expect(res.body.errors).toContain('Item "Product Without SKU" has no SKU - skipped certificate creation');
      });
    });

    describe('POST /api/integrations/shopify/webhook/orders/updated', () => {
      it('should process order update webhook', async () => {
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

        const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/shopify/webhook/orders/updated')
          .set('X-Shopify-Topic', 'orders/updated')
          .set('X-Shopify-Hmac-Sha256', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('processed');
      });
    });
  });

  describe('WooCommerce Webhooks', () => {
    describe('POST /api/integrations/woocommerce/webhook/orders', () => {
      it('should process WooCommerce order webhook and create certificates', async () => {
        const mockOrderWebhook = {
          id: 123,
          status: 'completed',
          billing: {
            email: 'customer@example.com',
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
          currency: 'USD'
        };

        // Generate valid HMAC signature
        const hmac = crypto.createHmac('sha256', 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/woocommerce/webhook/orders')
          .set('X-WC-Webhook-Topic', 'order.created')
          .set('X-WC-Webhook-Signature', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('processed');
        expect(res.body.processed).toBeGreaterThan(0);

        // Verify certificate was created
        const certificate = await Certificate.findOne({
          business: testBusiness._id,
          product: testProduct._id,
          recipient: 'customer@example.com'
        });

        expect(certificate).not.toBeNull();
        expect(certificate?.status).toBe('minted');
      });

      it('should only process completed/processing orders', async () => {
        const mockOrderWebhook = {
          id: 123,
          status: 'pending',
          billing: {
            email: 'customer@example.com'
          },
          line_items: [
            {
              id: 1,
              name: 'Test Product',
              sku: 'PROD-123',
              quantity: 1,
              price: 29.99
            }
          ]
        };

        const hmac = crypto.createHmac('sha256', 'cs_test_consumer_secret_1234567890abcdef1234567890abcdef');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/woocommerce/webhook/orders')
          .set('X-WC-Webhook-Topic', 'order.created')
          .set('X-WC-Webhook-Signature', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body.processed).toBe(0);
        expect(res.body.errors).toContain('Order status pending - skipping certificate creation');
      });

      it('should reject webhook with invalid signature', async () => {
        const mockOrderWebhook = {
          id: 123,
          status: 'completed',
          billing: { email: 'customer@example.com' },
          line_items: [
            {
              id: 1,
              name: 'Test Product',
              sku: 'PROD-123',
              quantity: 1,
              price: 29.99
            }
          ]
        };

        const res = await request(app)
          .post('/api/integrations/woocommerce/webhook/orders')
          .set('X-WC-Webhook-Topic', 'order.created')
          .set('X-WC-Webhook-Signature', 'invalid_signature')
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Invalid webhook signature');
      });
    });
  });

  describe('Wix Webhooks', () => {
    describe('POST /api/integrations/wix/webhook/orders', () => {
      it('should process Wix order webhook and create certificates', async () => {
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
                productName: { original: 'Test Product' },
                sku: 'PROD-123',
                quantity: 1,
                price: { amount: '29.99' }
              }
            ],
            status: 'PAID',
            fulfillmentStatus: 'FULFILLED'
          }
        };

        // Generate valid HMAC signature
        const hmac = crypto.createHmac('sha256', 'wix_refresh_token_1234567890abcdef');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/wix/webhook/orders')
          .set('X-Wix-Event-Type', 'OrderCreated')
          .set('X-Wix-Signature', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('processed');
        expect(res.body.processed).toBeGreaterThan(0);

        // Verify certificate was created
        const certificate = await Certificate.findOne({
          business: testBusiness._id,
          product: testProduct._id,
          recipient: 'customer@example.com'
        });

        expect(certificate).not.toBeNull();
        expect(certificate?.status).toBe('minted');
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

        const hmac = crypto.createHmac('sha256', 'wix_refresh_token_1234567890abcdef');
        hmac.update(JSON.stringify(mockOrderWebhook));
        const signature = hmac.digest('base64');

        const res = await request(app)
          .post('/api/integrations/wix/webhook/orders')
          .set('X-Wix-Event-Type', 'OrderCreated')
          .set('X-Wix-Signature', signature)
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(200);
        expect(res.body.processed).toBe(1);
      });

      it('should reject webhook with invalid signature', async () => {
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

        const res = await request(app)
          .post('/api/integrations/wix/webhook/orders')
          .set('X-Wix-Event-Type', 'OrderCreated')
          .set('X-Wix-Signature', 'invalid_signature')
          .send(mockOrderWebhook);

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Invalid webhook signature');
      });
    });
  });

  describe('Webhook Error Handling', () => {
    it('should handle missing brand settings gracefully', async () => {
      // Delete brand settings to simulate missing integration
      await BrandSettings.deleteOne({ business: testBusiness._id });

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
        financial_status: 'paid'
      };

      const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
      hmac.update(JSON.stringify(mockOrderWebhook));
      const signature = hmac.digest('base64');

      const res = await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Hmac-Sha256', signature)
        .send(mockOrderWebhook);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Integration not configured');
    });

    it('should handle invalid JSON payload', async () => {
      const res = await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Hmac-Sha256', 'signature')
        .send('invalid json');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should handle missing webhook headers', async () => {
      const mockOrderWebhook = {
        id: 123456789,
        email: 'customer@example.com',
        line_items: []
      };

      const res = await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .send(mockOrderWebhook);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Missing required headers');
    });
  });

  describe('Certificate Creation Flow', () => {
    it('should create certificate with proper metadata', async () => {
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

      const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
      hmac.update(JSON.stringify(mockOrderWebhook));
      const signature = hmac.digest('base64');

      const res = await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Hmac-Sha256', signature)
        .send(mockOrderWebhook);

      expect(res.statusCode).toEqual(200);

      // Verify certificate details
      const certificate = await Certificate.findOne({
        business: testBusiness._id,
        product: testProduct._id,
        recipient: 'customer@example.com'
      });

      expect(certificate).not.toBeNull();
      expect(certificate?.business.toString()).toBe(testBusiness._id.toString());
      expect(certificate?.product.toString()).toBe(testProduct._id.toString());
      expect(certificate?.recipient).toBe('customer@example.com');
      expect(certificate?.contactMethod).toBe('email');
      expect(certificate?.status).toBe('minted');
      expect(certificate?.tokenId).toBeDefined();
      expect(certificate?.txHash).toBeDefined();
      expect(certificate?.contractAddress).toBeDefined();
    });

    it('should prevent duplicate certificates for same order', async () => {
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
        financial_status: 'paid'
      };

      const hmac = crypto.createHmac('sha256', 'test_webhook_secret');
      hmac.update(JSON.stringify(mockOrderWebhook));
      const signature = hmac.digest('base64');

      // Process webhook first time
      await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Hmac-Sha256', signature)
        .send(mockOrderWebhook);

      // Process same webhook again
      const res = await request(app)
        .post('/api/integrations/shopify/webhook/orders/create')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Hmac-Sha256', signature)
        .send(mockOrderWebhook);

      expect(res.statusCode).toEqual(200);

      // Should only have one certificate
      const certificates = await Certificate.find({
        business: testBusiness._id,
        product: testProduct._id,
        recipient: 'customer@example.com'
      });

      expect(certificates).toHaveLength(1);
    });
  });
});
