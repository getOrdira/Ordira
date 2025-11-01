// src/controllers/integrations/ecommerce/ecommerceHealth.controller.ts
// Controller exposing ecommerce integration health & analytics

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';
import type {
  ExpectedWebhookDefinition
} from '../../../services/integrations/ecommerce';

interface ConnectionHealthRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedBody?: {
    expectedWebhooks?: ExpectedWebhookDefinition[];
  };
  validatedQuery?: {
    includeWebhookDiff?: boolean;
  };
}

interface AnalyticsRequest extends EcommerceBaseRequest {
  validatedParams?: {
    businessId?: string;
    provider?: string;
  };
  validatedQuery?: {
    includeHealthDetails?: boolean;
  };
}

export class EcommerceHealthController extends EcommerceBaseController {
  /**
   * Retrieve connection health report for a provider.
   */
  async getConnectionHealthReport(req: ConnectionHealthRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_HEALTH_REPORT');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);
      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const includeWebhookDiff =
        req.validatedQuery?.includeWebhookDiff ??
        this.parseOptionalBoolean((req.query as any)?.includeWebhookDiff) ??
        false;

      const expectedWebhooks = (body.expectedWebhooks as ExpectedWebhookDefinition[] | undefined) ?? undefined;

      try {
        const report = await this.ecommerceConnectionHealthService.getHealthReport(
          provider,
          businessId,
          {
            includeWebhookDiff,
            expectedWebhooks
          }
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_HEALTH_REPORT_SUCCESS', {
          businessId,
          provider,
          includeWebhookDiff,
          overall: report.overall
        });

        return {
          provider,
          businessId,
          report
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Connection health report generated successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve analytics snapshot for a provider integration.
   */
  async getIntegrationAnalytics(req: AnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_ANALYTICS');

      const businessId = this.requireBusinessId(req);
      const provider = this.requireProvider(req);

      const includeHealthDetails =
        req.validatedQuery?.includeHealthDetails ??
        this.parseOptionalBoolean((req.query as any)?.includeHealthDetails) ??
        false;

      try {
        const report = await this.ecommerceAnalyticsService.getIntegrationAnalytics(
          provider,
          businessId,
          { includeHealthDetails }
        );

        this.logAction(req, 'INTEGRATIONS_ECOM_ANALYTICS_SUCCESS', {
          businessId,
          provider,
          health: report.health
        });

        return {
          provider,
          businessId,
          report: this.serialiseIntegrationAnalytics(report)
        };
      } catch (error) {
        this.handleIntegrationError(error);
      }
    }, res, 'Integration analytics retrieved successfully', this.getRequestMeta(req));
  }
}

export const ecommerceHealthController = new EcommerceHealthController();

