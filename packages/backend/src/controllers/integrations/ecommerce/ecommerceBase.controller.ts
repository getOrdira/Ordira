// src/controllers/integrations/ecommerce/ecommerceBase.controller.ts
// Shared helpers for ecommerce integration controllers

import { IntegrationsBaseController, IntegrationsBaseRequest } from '../integrationsBase.controller';
import type { EcommerceProvider } from '../../../services/integrations/ecommerce';

/**
 * Base controller dedicated to ecommerce integration flows.
 */
export abstract class EcommerceBaseController extends IntegrationsBaseController {
  /**
   * Resolve a provider from params/query/body or throw when missing.
   */
  protected requireProvider(req: IntegrationsBaseRequest): EcommerceProvider {
    const provider =
      req.validatedParams?.provider ??
      req.validatedBody?.provider ??
      req.validatedQuery?.provider ??
      (req.params as any)?.provider ??
      (req.body as any)?.provider ??
      (req.query as any)?.provider;

    return this.requireEcommerceProvider(provider);
  }

  /**
   * Optional provider lookup returning undefined when not present.
   */
  protected resolveProvider(req: IntegrationsBaseRequest): EcommerceProvider | undefined {
    const provider =
      req.validatedParams?.provider ??
      req.validatedBody?.provider ??
      req.validatedQuery?.provider ??
      (req.params as any)?.provider ??
      (req.body as any)?.provider ??
      (req.query as any)?.provider;

    const parsed = this.parseString(provider);
    return parsed ? this.requireEcommerceProvider(parsed) : undefined;
  }
}

export type EcommerceBaseRequest = IntegrationsBaseRequest;

