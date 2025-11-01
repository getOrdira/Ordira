// src/controllers/integrations/domains/domainsIntegrationBase.controller.ts
// Shared helpers for domain integration controllers

import { IntegrationsBaseController, IntegrationsBaseRequest } from '../integrationsBase.controller';

export abstract class DomainsIntegrationBaseController extends IntegrationsBaseController {
  protected requireDomainId(req: IntegrationsBaseRequest): string {
    const candidate =
      req.validatedParams?.domainId ??
      req.validatedBody?.domainId ??
      req.validatedQuery?.domainId ??
      (req.params as any)?.domainId ??
      (req.body as any)?.domainId ??
      (req.query as any)?.domainId;

    const domainId = this.parseString(candidate);
    if (!domainId) {
      throw { statusCode: 400, message: 'Domain identifier is required' };
    }
    return domainId;
  }
}

export type DomainsIntegrationBaseRequest = IntegrationsBaseRequest;

