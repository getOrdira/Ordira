// src/controllers/integrations/ecommerce/ecommerceWebhooks.controller.ts
// Controller exposing ecommerce webhook utilities & reconciliation endpoints

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import type {
  ExpectedWebhookDefinition,
  WebhookReconciliationResult
} from '../../../services/integrations/ecommerce';

interface WebhookDiffRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: {
    expected?: ExpectedWebhookDefinition[];
  };
}

interface WebhookReconcileRequest extends WebhookDiffRequest {
  validatedBody?: {
    expected?: ExpectedWebhookDefinition[];
    dryRun?: boolean;
  };
}

interface WebhookListRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
}

interface BuildCallbackRequest extends EcommerceBaseRequest {
  validatedParams?: {
    provider?: string;
  };
  validatedBody?: {
    appUrl?: string;
    relativePath?: string;
    queryParams?: Record<string, string | number | boolean | undefined>;
  };
}

export class EcommerceWebhooksController extends EcommerceBaseController {
  /**
   * Fetch provider webhooks for inspection.
   */
  async listProviderWebhooks(req: WebhookListRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_WEBHOOKS_LIST');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);

      const adapters = this.getProviderAdapters(provider);
      if (!adapters?.webhooks) {
        throw { statusCode: 501, message: `Provider ${provider} does not expose webhook adapters` };
      }

      try {
        const webhooks = await adapters.webhooks.list(businessId);

        this.logAction(req, 'INTEGRATIONS_ECOM_WEBHOOKS_LIST_SUCCESS', {
          businessId,
          provider,
          count: webhooks.length
        });

        return {
          provider,
          businessId,
          webhooks
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Provider webhooks retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Calculate diff between expected and existing provider webhooks.
   */
  async diffWebhooks(req: WebhookDiffRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_WEBHOOKS_DIFF');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const expected = (body.expected as ExpectedWebhookDefinition[] | undefined) ?? [];
      if (!expected || expected.length === 0) {
        throw { statusCode: 400, message: 'Expected webhook definitions are required' };
      }

      const adapters = this.getProviderAdapters(provider);
      if (!adapters?.webhooks) {
        throw { statusCode: 501, message: `Provider ${provider} does not expose webhook adapters` };
      }

      try {
        const existing = await adapters.webhooks.list(businessId);
        const diff = this.ecommerceWebhookRegistryService.diffWebhooks(expected, existing);

        this.logAction(req, 'INTEGRATIONS_ECOM_WEBHOOKS_DIFF_SUCCESS', {
          businessId,
          provider,
          create: diff.toCreate.length,
          update: diff.toUpdate.length,
          delete: diff.toDelete.length
        });

        return {
          provider,
          businessId,
          diff
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Webhook diff generated successfully', this.getRequestMeta(req));
  }

  /**
   * Reconcile provider webhooks with desired definitions.
   */
  async reconcileWebhooks(req: WebhookReconcileRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_WEBHOOKS_RECONCILE');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const expected = (body.expected as ExpectedWebhookDefinition[] | undefined) ?? [];
      if (!expected || expected.length === 0) {
        throw { statusCode: 400, message: 'Expected webhook definitions are required' };
      }

      const dryRun =
        this.parseOptionalBoolean(body.dryRun) ??
        this.parseOptionalBoolean((req.query as any)?.dryRun) ??
        false;

      try {
        const result = await this.ecommerceWebhookOrchestratorService.reconcile(
          provider,
          businessId,
          expected,
          { dryRun }
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_WEBHOOKS_RECONCILE_SUCCESS', {
          businessId,
          provider,
          dryRun,
          created: result.created,
          updated: result.updated,
          deleted: result.deleted
        });

        return this.serialiseWebhookResult(result);
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Webhook reconciliation completed', this.getRequestMeta(req));
  }

  /**
   * Build a callback URL for registering provider webhooks.
   */
  async buildCallbackUrl(req: BuildCallbackRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_WEBHOOKS_CALLBACK_URL');

      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const appUrl = this.parseString(body.appUrl);
      const relativePath = this.parseString(body.relativePath);

      if (!appUrl || !relativePath) {
        throw { statusCode: 400, message: 'appUrl and relativePath are required' };
      }

      const queryParams = (body.queryParams as Record<string, string | number | boolean | undefined> | undefined) ?? undefined;

      try {
        const url = this.ecommerceWebhookRegistryService.buildCallbackUrl(
          appUrl,
          provider,
          relativePath,
          queryParams
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_WEBHOOKS_CALLBACK_URL_SUCCESS', {
          provider,
          appUrl,
          relativePath
        });

        return {
          provider,
          url
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Webhook callback URL generated successfully', this.getRequestMeta(req));
  }

  private serialiseWebhookResult(result: WebhookReconciliationResult) {
    return {
      provider: result.provider,
      businessId: result.businessId,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      issues: result.issues,
      diff: result.diff
    };
  }
}

export const ecommerceWebhooksController = new EcommerceWebhooksController();

