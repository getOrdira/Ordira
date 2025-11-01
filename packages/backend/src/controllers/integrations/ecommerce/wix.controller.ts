// src/controllers/integrations/ecommerce/wix.controller.ts
// Wix-specific controller for legacy compatibility and provider-specific operations

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import { wixAuthService } from '../../../services/integrations/ecommerce/providers/wix/wixAuth.service';
import { wixClientService } from '../../../services/integrations/ecommerce/providers/wix/wixClient.service';

interface WixConnectRequest extends EcommerceBaseRequest {
  validatedBody?: {
    returnUrl?: string;
  };
}

interface WixCallbackRequest extends EcommerceBaseRequest {
  validatedQuery?: {
    code?: string;
    state?: string;
    instance_id?: string;
    context?: string;
  };
}

interface WixSyncRequest extends EcommerceBaseRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
  };
}

interface WixWebhookRequest extends EcommerceBaseRequest {
  validatedBody?: Record<string, unknown>;
  rawBody?: Buffer;
}

export class WixController extends EcommerceBaseController {
  /**
   * Generate Wix OAuth installation URL.
   */
  async generateInstallUrl(req: WixConnectRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_GENERATE_URL');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const returnUrl = this.parseString(body.returnUrl);

      const result = await wixAuthService.generateInstallUrl(businessId, { returnUrl });

      this.logAction(req, 'INTEGRATIONS_WIX_GENERATE_URL_SUCCESS', {
        businessId
      });

      return {
        provider: 'wix',
        businessId,
        ...result
      };
    }, res, 'Wix OAuth URL generated successfully', this.getRequestMeta(req));
  }

  /**
   * Handle Wix OAuth callback.
   */
  async handleOAuthCallback(req: WixCallbackRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_OAUTH_CALLBACK');

      const query = this.sanitizeInput(
        (req.validatedQuery ?? (req.query as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const callbackParams = {
        code: this.parseString(query.code),
        state: this.parseString(query.state),
        error: this.parseString(query.error),
        error_description: this.parseString(query.error_description)
      };

      if (!callbackParams.code || !callbackParams.state) {
        throw { statusCode: 400, message: 'Missing required OAuth parameters' };
      }

      await wixAuthService.handleOAuthCallback(callbackParams);

      this.logAction(req, 'INTEGRATIONS_WIX_OAUTH_CALLBACK_SUCCESS', {
        code: Boolean(callbackParams.code)
      });

      return {
        provider: 'wix',
        success: true
      };
    }, res, 'Wix OAuth callback processed successfully', this.getRequestMeta(req));
  }

  /**
   * Get Wix connection status.
   */
  async getConnectionStatus(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_STATUS');

      const businessId = this.requireBusinessId(req);

      const record = await this.ecommerceIntegrationDataService.getIntegrationRecord(businessId, 'wix');

      this.logAction(req, 'INTEGRATIONS_WIX_STATUS_SUCCESS', {
        businessId,
        connected: record.connected
      });

      return {
        provider: 'wix',
        businessId,
        status: {
          connected: record.connected,
          instanceId: record.domain,
          connectedAt: record.connectedAt?.toISOString(),
          lastSyncAt: record.lastSyncAt?.toISOString()
        }
      };
    }, res, 'Wix connection status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Test Wix connection.
   */
  async testConnection(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_TEST_CONNECTION');

      const businessId = this.requireBusinessId(req);

      const healthy = await wixClientService.testConnection(businessId);

      this.logAction(req, 'INTEGRATIONS_WIX_TEST_CONNECTION_SUCCESS', {
        businessId,
        healthy
      });

      return {
        provider: 'wix',
        businessId,
        healthy
      };
    }, res, 'Wix connection test completed', this.getRequestMeta(req));
  }

  /**
   * Trigger product sync from Wix.
   */
  async syncProducts(req: WixSyncRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_SYNC');

      const businessId = this.requireBusinessId(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const syncType = (body.syncType as string) || 'products';
      const forceSync = this.parseOptionalBoolean(body.forceSync) ?? false;

      const result = await this.ecommerceProductSyncService.syncProducts(
        'wix',
        businessId,
        { fullSync: forceSync }
      );

      this.logAction(req, 'INTEGRATIONS_WIX_SYNC_SUCCESS', {
        businessId,
        syncType,
        synced: result.synced
      });

      return {
        provider: 'wix',
        businessId,
        syncType,
        result
      };
    }, res, 'Wix sync completed successfully', this.getRequestMeta(req));
  }

  /**
   * Handle Wix webhook.
   */
  async handleWebhook(req: WixWebhookRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_WIX_WEBHOOK');

      const businessId = this.requireBusinessId(req);
      const payload = req.validatedBody ?? (req.body as Record<string, unknown>) ?? {};

      const result = await this.ecommerceOrderProcessingService.processWebhookPayload(
        'wix',
        businessId,
        payload
      );

      this.logAction(req, 'INTEGRATIONS_WIX_WEBHOOK_SUCCESS', {
        businessId,
        created: result.created
      });

      return {
        provider: 'wix',
        businessId,
        result
      };
    }, res, 'Wix webhook processed successfully', this.getRequestMeta(req));
  }
}

export const wixController = new WixController();

