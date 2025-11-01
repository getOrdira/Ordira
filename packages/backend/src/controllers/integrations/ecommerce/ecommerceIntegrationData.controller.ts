// src/controllers/integrations/ecommerce/ecommerceIntegrationData.controller.ts
// Controller exposing ecommerce integration credential & metadata operations

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import type {
  IntegrationCredentialsInput,
  EcommerceProvider
} from '../../../services/integrations/ecommerce';

interface IntegrationStatusRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedQuery?: {
    businessId?: string;
    provider?: string;
    includeSecrets?: boolean;
  };
}

interface IntegrationUpsertRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: Partial<IntegrationCredentialsInput> & {
    provider?: string;
    businessId?: string;
  };
}

interface IntegrationClearRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedQuery?: {
    provider?: string;
  };
}

interface IntegrationSyncRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: {
    metadata?: Record<string, unknown>;
  };
}

interface IntegrationLookupRequest extends EcommerceBaseRequest {
  validatedQuery?: {
    provider?: string;
    identifier?: string;
  };
}

interface IntegrationListRequest extends EcommerceBaseRequest {
  validatedQuery?: {
    provider?: string;
  };
}

export class EcommerceIntegrationDataController extends EcommerceBaseController {
  /**
   * Retrieve credential status for a business/provider pair.
   */
  async getIntegrationStatus(req: IntegrationStatusRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_STATUS');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const includeSecrets =
        req.validatedQuery?.includeSecrets ??
        this.parseOptionalBoolean((req.query as any)?.includeSecrets) ??
        false;

      try {
        const record = await this.ecommerceIntegrationDataService.getIntegrationRecord(
          businessId,
          provider,
          { includeSecrets }
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_STATUS_SUCCESS', {
          businessId,
          provider,
          includeSecrets
        });

        return {
          provider,
          businessId,
          record
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Upsert integration credentials for a provider.
   */
  async upsertIntegrationCredentials(req: IntegrationUpsertRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_UPSERT');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const payload = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Partial<IntegrationCredentialsInput>) ?? {}) as Partial<IntegrationCredentialsInput>
      );

      const credentials: IntegrationCredentialsInput = {
        domain: this.parseString(payload.domain),
        accessToken: payload.accessToken ? String(payload.accessToken) : undefined,
        refreshToken: payload.refreshToken ? String(payload.refreshToken) : undefined,
        secret: payload.secret ? String(payload.secret) : undefined,
        additionalSecrets: payload.additionalSecrets,
        connectedAt: this.parseDate(payload.connectedAt) ?? undefined,
        lastSyncAt: this.parseDate(payload.lastSyncAt) ?? undefined,
        metadata: payload.metadata
      };

      try {
        const record = await this.ecommerceIntegrationDataService.upsertIntegrationCredentials(
          businessId,
          provider,
          credentials
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_UPSERT_SUCCESS', {
          businessId,
          provider,
          hasDomain: Boolean(credentials.domain),
          hasAccessToken: Boolean(credentials.accessToken)
        });

        return {
          provider,
          businessId,
          record
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration credentials saved successfully', this.getRequestMeta(req));
  }

  /**
   * Remove integration credentials for a provider.
   */
  async clearIntegration(req: IntegrationClearRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_CLEAR');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);

      try {
        await this.ecommerceIntegrationDataService.clearIntegration(businessId, provider);

        this.logAction(req, 'INTEGRATIONS_ECOM_CLEAR_SUCCESS', {
          businessId,
          provider
        });

        return {
          provider,
          businessId,
          cleared: true,
          clearedAt: new Date().toISOString()
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration credentials cleared successfully', this.getRequestMeta(req));
  }

  /**
   * Record a successful sync timestamp.
   */
  async recordSuccessfulSync(req: IntegrationSyncRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_SYNC_RECORD');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const metadata = (req.validatedBody?.metadata ?? (req.body as any)?.metadata) as Record<string, unknown> | undefined;

      try {
        const record = await this.ecommerceIntegrationDataService.recordSuccessfulSync(
          businessId,
          provider,
          metadata
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_SYNC_RECORD_SUCCESS', {
          businessId,
          provider,
          lastSyncAt: record.lastSyncAt.toISOString()
        });

        return {
          provider,
          businessId,
          sync: {
            lastSyncAt: record.lastSyncAt.toISOString(),
            metadata: record.metadata ?? {}
          }
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration sync recorded successfully', this.getRequestMeta(req));
  }

  /**
   * Locate a business by provider identifier (e.g. Shopify domain).
   */
  async findBusinessByProviderIdentifier(req: IntegrationLookupRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_LOOKUP');

      const provider = this.requireProvider(req);
      const identifier =
        this.parseString(req.validatedQuery?.identifier) ??
        this.parseString((req.query as any)?.identifier);

      if (!identifier) {
        throw { statusCode: 400, message: 'Provider identifier is required' };
      }

      try {
        const businessId = await this.ecommerceIntegrationDataService.findBusinessByProviderIdentifier(
          provider,
          identifier
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_LOOKUP_SUCCESS', {
          provider,
          identifier,
          found: Boolean(businessId)
        });

        return {
          provider,
          identifier,
          businessId
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration lookup completed', this.getRequestMeta(req));
  }

  /**
   * List business identifiers that currently have a provider connected.
   */
  async listConnectedBusinesses(req: IntegrationListRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_CONNECTED');

      const provider = this.requireProvider(req);

      try {
        const businesses = await this.ecommerceIntegrationDataService.listConnectedBusinesses(provider);

        this.logAction(req, 'INTEGRATIONS_ECOM_CONNECTED_SUCCESS', {
          provider,
          count: businesses.length
        });

        return {
          provider,
          businesses
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Connected businesses listed successfully', this.getRequestMeta(req));
  }
}

export const ecommerceIntegrationDataController = new EcommerceIntegrationDataController();

