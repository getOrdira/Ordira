// src/controllers/integrations/ecommerce/ecommerceProviders.controller.ts
// Controller exposing ecommerce provider registry utilities

import { Response } from 'express';
import { EcommerceBaseController, EcommerceBaseRequest } from './ecommerceBase.controller';

interface ProviderCapabilitiesRequest extends EcommerceBaseRequest {
  validatedParams?: {
    provider?: string;
  };
}

export class EcommerceProvidersController extends EcommerceBaseController {
  /**
   * List supported ecommerce providers and top-level metadata.
   */
  async listProviders(req: EcommerceBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_PROVIDERS_LIST');

      const providers = Object.entries(this.ecommerceServices.providers).map(([key, value]) => ({
        provider: key,
        hasOrders: Boolean(value.adapters?.orders),
        hasProducts: Boolean(value.adapters?.products),
        hasWebhooks: Boolean(value.adapters?.webhooks),
        hasAnalytics: Boolean(value.adapters?.analytics),
        hasConnectionHealth: Boolean(value.adapters?.connection)
      }));

      this.logAction(req, 'INTEGRATIONS_ECOM_PROVIDERS_LIST_SUCCESS', {
        count: providers.length
      });

      return {
        providers
      };
    }, res, 'Supported ecommerce providers retrieved', this.getRequestMeta(req));
  }

  /**
   * Detailed provider capability information.
   */
  async getProviderCapabilities(req: ProviderCapabilitiesRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_ECOM_PROVIDERS_CAPABILITIES');

      const provider = this.requireProvider(req);
      const details = this.ecommerceServices.providers[provider];

      this.logAction(req, 'INTEGRATIONS_ECOM_PROVIDERS_CAPABILITIES_SUCCESS', {
        provider
      });

      return {
        provider,
        adapters: {
          hasOrders: Boolean(details.adapters?.orders),
          hasProducts: Boolean(details.adapters?.products),
          hasWebhooks: Boolean(details.adapters?.webhooks),
          hasAnalytics: Boolean(details.adapters?.analytics),
          hasConnection: Boolean(details.adapters?.connection)
        }
      };
    }, res, 'Provider capabilities retrieved', this.getRequestMeta(req));
  }
}

export const ecommerceProvidersController = new EcommerceProvidersController();

