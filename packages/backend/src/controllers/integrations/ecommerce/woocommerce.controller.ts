// src/controllers/integrations/ecommerce/woocommerce.controller.ts
// WooCommerce-specific controller for legacy compatibility and provider-specific operations

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import { wooAuthService } from '../../../services/integrations/ecommerce/providers/woocommerce/wooAuth.service';
import { wooClientService } from '../../../services/integrations/ecommerce/providers/woocommerce/wooClient.service';

interface WooConnectRequest extends EcommerceBaseRequest {
  validatedBody?: {
    domain: string;
    consumerKey: string;
    consumerSecret: string;
    version?: string;
    verifySsl?: boolean;
  };
}

interface WooSyncRequest extends EcommerceBaseRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    batchSize?: number;
  };
}

interface WooWebhookRequest extends EcommerceBaseRequest {
  validatedBody?: Record<string, unknown>;
  rawBody?: Buffer;
}

export class WooCommerceController extends EcommerceBaseController {
  /**
   * Connect WooCommerce with credentials.
   */
  async connect(req: WooConnectRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_CONNECT');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const domain = this.parseString(body.domain);
      const consumerKey = this.parseString(body.consumerKey);
      const consumerSecret = this.parseString(body.consumerSecret);

      if (!domain || !consumerKey || !consumerSecret) {
        throw { statusCode: 400, message: 'Domain, consumer key, and secret are required' };
      }

      const verifySsl = this.parseOptionalBoolean(body.verifySsl) ?? true;
      const version = this.parseString(body.version) || 'wc/v3';

      const result = await wooAuthService.connect(businessId, {
        domain,
        consumerKey,
        consumerSecret,
        verifySsl,
        description: `Connected via API on ${new Date().toISOString()}`
      });

      this.logAction(req, 'INTEGRATIONS_WOO_CONNECT_SUCCESS', {
        businessId,
        domain
      });

      return {
        provider: 'woocommerce',
        businessId,
        ...result
      };
    }, res, 'WooCommerce connected successfully', this.getRequestMeta(req));
  }

  /**
   * Get WooCommerce connection status.
   */
  async getConnectionStatus(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_STATUS');

      const businessId = this.requireBusinessId(req);

      const record = await this.ecommerceIntegrationDataService.getIntegrationRecord(businessId, 'woocommerce');

      this.logAction(req, 'INTEGRATIONS_WOO_STATUS_SUCCESS', {
        businessId,
        connected: record.connected
      });

      return {
        provider: 'woocommerce',
        businessId,
        status: {
          connected: record.connected,
          domain: record.domain,
          connectedAt: record.connectedAt?.toISOString(),
          lastSyncAt: record.lastSyncAt?.toISOString()
        }
      };
    }, res, 'WooCommerce connection status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Disconnect WooCommerce.
   */
  async disconnect(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_DISCONNECT');

      const businessId = this.requireBusinessId(req);

      await wooAuthService.disconnect(businessId);

      this.logAction(req, 'INTEGRATIONS_WOO_DISCONNECT_SUCCESS', {
        businessId
      });

      return {
        provider: 'woocommerce',
        businessId,
        disconnected: true,
        disconnectedAt: new Date().toISOString()
      };
    }, res, 'WooCommerce disconnected successfully', this.getRequestMeta(req));
  }

  /**
   * Test WooCommerce connection.
   */
  async testConnection(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_TEST_CONNECTION');

      const businessId = this.requireBusinessId(req);

      const healthy = await wooClientService.testConnection(businessId);

      this.logAction(req, 'INTEGRATIONS_WOO_TEST_CONNECTION_SUCCESS', {
        businessId,
        healthy
      });

      return {
        provider: 'woocommerce',
        businessId,
        healthy
      };
    }, res, 'WooCommerce connection test completed', this.getRequestMeta(req));
  }

  /**
   * Trigger product sync from WooCommerce.
   */
  async syncProducts(req: WooSyncRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_SYNC');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const syncType = (body.syncType as string) || 'products';
      const forceSync = this.parseOptionalBoolean(body.forceSync) ?? false;
      const batchSize = this.parseOptionalNumber(body.batchSize, { min: 1, max: 500 }) || 50;

      const result = await this.ecommerceProductSyncService.syncProducts(
        'woocommerce',
        businessId,
        { fullSync: forceSync, batchSize }
      );

      this.logAction(req, 'INTEGRATIONS_WOO_SYNC_SUCCESS', {
        businessId,
        syncType,
        synced: result.synced
      });

      return {
        provider: 'woocommerce',
        businessId,
        syncType,
        batchSize,
        result
      };
    }, res, 'WooCommerce sync completed successfully', this.getRequestMeta(req));
  }

  /**
   * Handle WooCommerce webhook.
   */
  async handleWebhook(req: WooWebhookRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WOO_WEBHOOK');

      const businessId = this.requireBusinessId(req);
      const payload = req.validatedBody ?? (req.body as Record<string, unknown>) ?? {};

      const result = await this.ecommerceOrderProcessingService.processWebhookPayload(
        'woocommerce',
        businessId,
        payload
      );

      this.logAction(req, 'INTEGRATIONS_WOO_WEBHOOK_SUCCESS', {
        businessId,
        created: result.created
      });

      return {
        provider: 'woocommerce',
        businessId,
        result
      };
    }, res, 'WooCommerce webhook processed successfully', this.getRequestMeta(req));
  }
}

export const woocommerceController = new WooCommerceController();

