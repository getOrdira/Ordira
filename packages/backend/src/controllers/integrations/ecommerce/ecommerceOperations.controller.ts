// src/controllers/integrations/ecommerce/ecommerceOperations.controller.ts
// Controller exposing ecommerce product sync and order processing operations

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import type { ProductSyncOptions, OrderProcessingOptions } from '../../../services/integrations/ecommerce';

interface ProductSyncRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: {
    fullSync?: boolean;
    batchSize?: number;
    cursor?: string | null;
    metadata?: Record<string, unknown>;
    recordSyncTimestamp?: boolean;
  };
  validatedQuery?: {
    fullSync?: boolean;
    batchSize?: number;
    cursor?: string;
    recordSyncTimestamp?: boolean;
  };
}

interface OrderProcessingRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
    orderId?: string;
  };
  validatedBody?: {
    skipCertificateCreation?: boolean;
    metadata?: Record<string, unknown>;
    source?: 'webhook' | 'manual' | 'api';
  };
}

interface OrderWebhookRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: Record<string, unknown>;
  validatedQuery?: {
    signature?: string;
    timestamp?: string;
  };
  rawBody?: Buffer; // express raw body if middleware configured
}

export class EcommerceOperationsController extends EcommerceBaseController {
  /**
   * Trigger a product synchronisation for a provider.
   */
  async syncProducts(req: ProductSyncRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_SYNC_PRODUCTS');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const options: ProductSyncOptions = {
        fullSync:
          this.parseOptionalBoolean(body.fullSync) ??
          req.validatedQuery?.fullSync ??
          this.parseOptionalBoolean((req.query as any)?.fullSync) ??
          false,
        batchSize: this.parseOptionalNumber(
          body.batchSize ?? req.validatedQuery?.batchSize ?? (req.query as any)?.batchSize,
          { min: 1, max: 500 }
        ),
        cursor:
          (body.cursor as string | null | undefined) ??
          (req.validatedQuery?.cursor as string | undefined) ??
          (req.query as any)?.cursor ??
          undefined,
        metadata: (body.metadata as Record<string, unknown> | undefined) ?? undefined,
        recordSyncTimestamp:
          this.parseOptionalBoolean(body.recordSyncTimestamp) ??
          req.validatedQuery?.recordSyncTimestamp ??
          this.parseOptionalBoolean((req.query as any)?.recordSyncTimestamp) ??
          true
      };

      try {
        const result = await this.ecommerceProductSyncService.syncProducts(
          provider,
          businessId,
          options
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_SYNC_PRODUCTS_SUCCESS', {
          businessId,
          provider,
          fullSync: options.fullSync,
          synced: result.synced,
          skipped: result.skipped
        });

        return {
          provider,
          businessId,
          result
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Product synchronisation completed', this.getRequestMeta(req));
  }

  /**
   * Process a single order by ID (manual or API initiated).
   */
  async processOrderById(req: OrderProcessingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_PROCESS_ORDER');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const orderId =
        this.parseString(req.validatedParams?.orderId) ??
        this.parseString((req.params as any)?.orderId);

      if (!orderId) {
        throw { statusCode: 400, message: 'orderId parameter is required' };
      }

      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const options: OrderProcessingOptions = {
        skipCertificateCreation:
          this.parseOptionalBoolean(body.skipCertificateCreation) ??
          this.parseOptionalBoolean((req.query as any)?.skipCertificateCreation) ??
          false,
        metadata: (body.metadata as Record<string, unknown> | undefined) ?? undefined,
        source: (body.source as OrderProcessingOptions['source']) ?? 'api'
      };

      try {
        const result = await this.ecommerceOrderProcessingService.processOrderById(
          provider,
          businessId,
          orderId,
          options
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_PROCESS_ORDER_SUCCESS', {
          businessId,
          provider,
          orderId,
          created: result.created,
          skipped: result.skipped
        });

        return {
          provider,
          businessId,
          result
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Order processed successfully', this.getRequestMeta(req));
  }

  /**
   * Process an incoming webhook payload for order fulfilment.
   */
  async processOrderWebhook(req: OrderWebhookRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_PROCESS_WEBHOOK');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const rawBody = (req as any).rawBody as Buffer | undefined;
      const bodyPayload = rawBody ?? Buffer.from(JSON.stringify(req.validatedBody ?? req.body));

      try {
        const record = await this.ecommerceIntegrationDataService.getIntegrationRecord(
          businessId,
          provider,
          { includeSecrets: true }
        );

        const secrets = (record.metadata?.secrets ?? {}) as Record<string, unknown>;
        const signature =
          this.parseString(req.validatedQuery?.signature) ??
          this.parseString((req.headers['x-hmac-signature'] as string | undefined)) ??
          this.parseString((req.headers['x-shopify-hmac-sha256'] as string | undefined)) ??
          this.parseString((req.headers['x-wix-signature'] as string | undefined)) ??
          this.parseString((req.headers['x-wc-webhook-signature'] as string | undefined)) ??
          this.parseString((req.query as any)?.signature);

        const secret =
          typeof secrets.secret === 'string'
            ? secrets.secret
            : typeof secrets.accessToken === 'string'
              ? (secrets.accessToken as string)
              : undefined;

        const signatureValid = this.ecommerceUtilities.verifyWebhookSignature({
          provider,
          payload: bodyPayload,
          signature,
          secret,
          headers: req.headers as Record<string, string | string[] | undefined>
        });

        if (!signatureValid) {
          throw { statusCode: 401, message: 'Webhook signature validation failed' };
        }

        const payload = req.validatedBody ?? (req.body as Record<string, unknown>) ?? {};
        const options: OrderProcessingOptions = {
          metadata: {
            webhookSignatureValidated: true
          },
          source: 'webhook'
        };

        const result = await this.ecommerceOrderProcessingService.processWebhookPayload(
          provider,
          businessId,
          payload,
          options
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_PROCESS_WEBHOOK_SUCCESS', {
          businessId,
          provider,
          created: result.created,
          skipped: result.skipped
        });

        return {
          provider,
          businessId,
          result
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Webhook processed successfully', this.getRequestMeta(req));
  }
}

export const ecommerceOperationsController = new EcommerceOperationsController();
