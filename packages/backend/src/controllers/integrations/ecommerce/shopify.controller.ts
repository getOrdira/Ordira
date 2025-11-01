// src/controllers/integrations/ecommerce/shopify.controller.ts
// Shopify-specific controller for legacy compatibility and provider-specific operations

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import { shopifyAuthService } from '../../../services/integrations/ecommerce/providers/shopify/shopifyAuth.service';
import { shopifyClientService } from '../../../services/integrations/ecommerce/providers/shopify/shopifyClient.service';

interface ShopifyConnectRequest extends EcommerceBaseRequest {
  validatedBody?: {
    shopDomain: string;
    returnUrl?: string;
  };
}

interface ShopifyCallbackRequest extends EcommerceBaseRequest {
  validatedQuery?: {
    shop?: string;
    code?: string;
    state?: string;
    hmac?: string;
    timestamp?: string;
  };
}

interface ShopifySyncRequest extends EcommerceBaseRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    batchSize?: number;
  };
}

interface ShopifyWebhookRequest extends EcommerceBaseRequest {
  validatedBody?: Record<string, unknown>;
  validatedQuery?: {
    signature?: string;
    timestamp?: string;
  };
  rawBody?: Buffer;
}

export class ShopifyController extends EcommerceBaseController {
  /**
   * Generate Shopify OAuth installation URL.
   */
  async generateInstallUrl(req: ShopifyConnectRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_GENERATE_URL');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const shopDomain = this.parseString(body.shopDomain);
      if (!shopDomain) {
        throw { statusCode: 400, message: 'Shop domain is required' };
      }

      const result = await shopifyAuthService.generateInstallUrl(businessId, shopDomain);

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_GENERATE_URL_SUCCESS', {
        businessId,
        shopDomain
      });

      return {
        provider: 'shopify',
        businessId,
        ...result
      };
    }, res, 'Shopify OAuth URL generated successfully', this.getRequestMeta(req));
  }

  /**
   * Handle Shopify OAuth callback.
   */
  async handleOAuthCallback(req: ShopifyCallbackRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_OAUTH_CALLBACK');

      const query = this.sanitizeInput(
        (req.validatedQuery ?? (req.query as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const callbackQuery = {
        shop: this.parseString(query.shop),
        code: this.parseString(query.code),
        state: this.parseString(query.state),
        hmac: this.parseString(query.hmac),
        timestamp: this.parseString(query.timestamp)
      };

      if (!callbackQuery.code || !callbackQuery.state || !callbackQuery.shop) {
        throw { statusCode: 400, message: 'Missing required OAuth parameters' };
      }

      await shopifyAuthService.handleOAuthCallback(callbackQuery);

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_OAUTH_CALLBACK_SUCCESS', {
        shop: callbackQuery.shop
      });

      return {
        provider: 'shopify',
        success: true,
        shop: callbackQuery.shop
      };
    }, res, 'Shopify OAuth callback processed successfully', this.getRequestMeta(req));
  }

  /**
   * Get Shopify connection status.
   */
  async getConnectionStatus(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_STATUS');

      const businessId = this.requireBusinessId(req);

      const record = await this.ecommerceIntegrationDataService.getIntegrationRecord(businessId, 'shopify');

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_STATUS_SUCCESS', {
        businessId,
        connected: record.connected
      });

      return {
        provider: 'shopify',
        businessId,
        status: {
          connected: record.connected,
          shopDomain: record.domain,
          connectedAt: record.connectedAt?.toISOString(),
          lastSyncAt: record.lastSyncAt?.toISOString()
        }
      };
    }, res, 'Shopify connection status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Test Shopify connection.
   */
  async testConnection(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_TEST_CONNECTION');

      const businessId = this.requireBusinessId(req);

      const healthy = await shopifyClientService.testConnection(businessId);

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_TEST_CONNECTION_SUCCESS', {
        businessId,
        healthy
      });

      return {
        provider: 'shopify',
        businessId,
        healthy
      };
    }, res, 'Shopify connection test completed', this.getRequestMeta(req));
  }

  /**
   * Trigger product sync from Shopify.
   */
  async syncProducts(req: ShopifySyncRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_SYNC');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const syncType = (body.syncType as string) || 'products';
      const forceSync = this.parseOptionalBoolean(body.forceSync) ?? false;

      const result = await this.ecommerceProductSyncService.syncProducts(
        'shopify',
        businessId,
        { fullSync: forceSync }
      );

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_SYNC_SUCCESS', {
        businessId,
        syncType,
        synced: result.synced
      });

      return {
        provider: 'shopify',
        businessId,
        syncType,
        result
      };
    }, res, 'Shopify sync completed successfully', this.getRequestMeta(req));
  }

  /**
   * Handle Shopify webhook.
   */
  async handleWebhook(req: ShopifyWebhookRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_SHOPIFY_WEBHOOK');

      const businessId = this.requireBusinessId(req);
      const rawBody = (req as any).rawBody as Buffer | undefined;
      const payload = req.validatedBody ?? (req.body as Record<string, unknown>) ?? {};

      const result = await this.ecommerceOrderProcessingService.processWebhookPayload(
        'shopify',
        businessId,
        payload
      );

      this.logAction(req, 'INTEGRATIONS_SHOPIFY_WEBHOOK_SUCCESS', {
        businessId,
        created: result.created
      });

      return {
        provider: 'shopify',
        businessId,
        result
      };
    }, res, 'Shopify webhook processed successfully', this.getRequestMeta(req));
  }
}

export const shopifyController = new ShopifyController();

