// src/controllers/features/domains/domainDns.controller.ts
// Controller exposing DNS guidance and verification operations

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type { DnsVerificationOptions } from '../../../services/domains/features/domainDns.service';

interface DomainDnsRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
    hostname?: string;
    token?: string;
    skipTxtValidation?: boolean;
  };
  validatedBody?: {
    businessId?: string;
    domainId?: string;
    hostname?: string;
    tokenOverride?: string;
    skipTxtValidation?: boolean;
  };
}

/**
 * DomainDnsController maps DNS-related requests to the domain DNS service.
 */
export class DomainDnsController extends DomainsBaseController {
  /**
   * Retrieve DNS instruction set for a domain mapping.
   */
  async getInstructionSet(req: DomainDnsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_DNS_INSTRUCTIONS');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const instructions = await this.domainDnsService.getInstructionSet(businessId, domainId);

      this.logAction(req, 'DOMAINS_DNS_INSTRUCTIONS_SUCCESS', {
        businessId,
        domainId,
      });

      return { instructions };
    }, res, 'DNS instruction set retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Verify DNS configuration for a domain mapping.
   */
  async verifyDnsConfiguration(req: DomainDnsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_DNS_VERIFY');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const body = req.validatedBody ?? (req.body as any) ?? {};
      const query = req.validatedQuery ?? (req.query as any) ?? {};

      const options: DnsVerificationOptions = {
        skipTxtValidation:
          body.skipTxtValidation !== undefined
            ? this.parseBoolean(body.skipTxtValidation)
            : this.parseOptionalBoolean(query.skipTxtValidation),
        tokenOverride: this.parseString(body.tokenOverride ?? query.token),
      };

      const result = await this.domainDnsService.verifyDnsConfiguration(businessId, domainId, options);

      this.logAction(req, 'DOMAINS_DNS_VERIFY_SUCCESS', {
        businessId,
        domainId,
        verified: result.verified,
      });

      return { result };
    }, res, 'DNS configuration verified successfully', this.getRequestMeta(req));
  }

  /**
   * Evaluate DNS records for a hostname without mutating persistence.
   */
  async evaluateDomainRecords(req: DomainDnsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_DNS_EVALUATE');

      const hostname =
        this.parseString(req.validatedQuery?.hostname ?? req.validatedBody?.hostname) ??
        this.requireDomainName(req);
      const token = this.parseString(req.validatedQuery?.token ?? req.validatedBody?.tokenOverride);
      const skipTxt =
        req.validatedQuery?.skipTxtValidation !== undefined
          ? this.parseBoolean(req.validatedQuery.skipTxtValidation)
          : req.validatedBody?.skipTxtValidation !== undefined
            ? this.parseBoolean(req.validatedBody.skipTxtValidation)
            : undefined;

      const result = await this.domainDnsService.evaluateDomainRecords(hostname, token, {
        skipTxtValidation: skipTxt,
      });

      this.logAction(req, 'DOMAINS_DNS_EVALUATE_SUCCESS', {
        hostname,
        status: result.status,
      });

      return { result };
    }, res, 'DNS records evaluated successfully', this.getRequestMeta(req));
  }
}

export const domainDnsController = new DomainDnsController();

