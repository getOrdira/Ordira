// src/controllers/features/domains/domainRegistry.controller.ts
// Controller exposing domain registry operations

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type { RegisterDomainOptions, ManagedCertificateResult } from '../../../services/domains/core/domainRegistry.service';
import type { UpdateDomainMappingInput } from '../../../services/domains/core/domainStorage.service';

interface RegisterDomainRequest extends DomainsBaseRequest {
  validatedBody?: Partial<RegisterDomainOptions> & {
    domain?: string;
  };
}

interface DomainActionRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedBody?: {
    businessId?: string;
    domainId?: string;
    requestedBy?: string;
    hostname?: string;
    domain?: string;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
    hostname?: string;
    domain?: string;
    requestedBy?: string;
  };
}

/**
 * DomainRegistryController maps HTTP requests to the domain registry service.
 */
export class DomainRegistryController extends DomainsBaseController {
  /**
   * Register a new domain for a business.
   */
  async registerDomain(req: RegisterDomainRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_REGISTER');

      const businessId = this.requireBusinessId(req);
      const domain = this.parseString(req.validatedBody?.domain ?? (req.body as any)?.domain) ?? this.requireDomainName(req);
      const payload = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});

      const options: RegisterDomainOptions = {
        businessId,
        domain,
        certificateType: this.parseString(payload.certificateType) as RegisterDomainOptions['certificateType'],
        forceHttps: payload.forceHttps !== undefined ? this.parseBoolean(payload.forceHttps) : undefined,
        autoRenewal: payload.autoRenewal !== undefined ? this.parseBoolean(payload.autoRenewal) : undefined,
        planLevel: this.parseString(payload.planLevel) as RegisterDomainOptions['planLevel'],
        createdBy: this.parseString(payload.createdBy) ?? req.userId ?? 'system',
        verificationMethod: this.parseString(payload.verificationMethod) as RegisterDomainOptions['verificationMethod'],
        dnsRecords: payload.dnsRecords,
        metadata: payload.metadata,
      };

      const result = await this.domainRegistryService.registerDomain(options);

      this.logAction(req, 'DOMAINS_REGISTER_SUCCESS', {
        businessId,
        domain: result.domain,
      });

      return {
        domain: result,
      };
    }, res, 'Domain registered successfully', this.getRequestMeta(req));
  }

  /**
   * Issue a managed certificate for a domain mapping.
   */
  async issueManagedCertificate(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERTIFICATE_ISSUE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy = this.parseString(
        req.validatedBody?.requestedBy ??
          req.validatedQuery?.requestedBy ??
          (req.body as any)?.requestedBy,
      ) ?? req.userId;

      const result: ManagedCertificateResult = await this.domainRegistryService.issueManagedCertificate(
        businessId,
        domainId,
        requestedBy,
      );

      this.logAction(req, 'DOMAINS_CERTIFICATE_ISSUE_SUCCESS', {
        businessId,
        domainId,
        expiresAt: result.certificate?.expiresAt?.toISOString(),
      });

      return {
        domain: result.domain,
        certificate: result.certificate,
      };
    }, res, 'Managed certificate issued successfully', this.getRequestMeta(req));
  }

  /**
   * Renew a managed certificate.
   */
  async renewManagedCertificate(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERTIFICATE_RENEW');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy = this.parseString(
        req.validatedBody?.requestedBy ??
          req.validatedQuery?.requestedBy ??
          (req.body as any)?.requestedBy,
      ) ?? req.userId;

      const result = await this.domainRegistryService.renewManagedCertificate(businessId, domainId, requestedBy);

      this.logAction(req, 'DOMAINS_CERTIFICATE_RENEW_SUCCESS', {
        businessId,
        domainId,
        expiresAt: result.certificate?.expiresAt?.toISOString(),
      });

      return {
        domain: result.domain,
        certificate: result.certificate,
      };
    }, res, 'Managed certificate renewed successfully', this.getRequestMeta(req));
  }

  /**
   * Revoke a managed certificate.
   */
  async revokeManagedCertificate(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERTIFICATE_REVOKE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const updated = await this.domainRegistryService.revokeManagedCertificate(businessId, domainId);

      this.logAction(req, 'DOMAINS_CERTIFICATE_REVOKE_SUCCESS', {
        businessId,
        domainId,
      });

      return {
        domain: updated,
      };
    }, res, 'Managed certificate revoked successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve managed certificate metadata for a hostname.
   */
  async getManagedCertificate(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERTIFICATE_GET');

      const hostname =
        this.parseString(req.validatedQuery?.hostname ?? req.validatedBody?.hostname) ??
        this.requireDomainName(req);

      const info = await this.domainRegistryService.getManagedCertificate(hostname);

      this.logAction(req, 'DOMAINS_CERTIFICATE_GET_SUCCESS', {
        hostname,
        exists: info?.exists,
      });

      return {
        hostname,
        certificate: info,
      };
    }, res, 'Managed certificate info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a domain mapping by identifier.
   */
  async getDomainById(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_GET_BY_ID');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const domain = await this.domainRegistryService.getDomainById(businessId, domainId);

      if (!domain) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_GET_BY_ID_SUCCESS', {
        businessId,
        domainId,
        domain: domain.domain,
      });

      return { domain };
    }, res, 'Domain mapping retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a domain mapping by domain name.
   */
  async getDomainByName(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_GET_BY_NAME');

      const businessId = this.requireBusinessId(req);
      const domain = this.requireDomainName(req);

      const mapping = await this.domainRegistryService.getDomainByDomain(businessId, domain);

      if (!mapping) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_GET_BY_NAME_SUCCESS', {
        businessId,
        domain,
        domainId: mapping._id?.toString?.(),
      });

      return { domain: mapping };
    }, res, 'Domain mapping retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * List domains for a business.
   */
  async listDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIST');

      const businessId = this.requireBusinessId(req);
      const domains = await this.domainRegistryService.listDomains(businessId);

      this.logAction(req, 'DOMAINS_LIST_SUCCESS', {
        businessId,
        count: domains.length,
      });

      return {
        domains,
        total: domains.length,
      };
    }, res, 'Domains listed successfully', this.getRequestMeta(req));
  }

  /**
   * Remove a domain mapping.
   */
  async deleteDomain(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_DELETE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const deleted = await this.domainRegistryService.deleteDomain(businessId, domainId);

      if (!deleted) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_DELETE_SUCCESS', {
        businessId,
        domainId,
      });

      return {
        domainId,
        deleted: true,
      };
    }, res, 'Domain mapping deleted successfully', this.getRequestMeta(req));
  }

  /**
   * Count domains for a business.
   */
  async countDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_COUNT');

      const businessId = this.requireBusinessId(req);
      const total = await this.domainRegistryService.countDomains(businessId);

      this.logAction(req, 'DOMAINS_COUNT_SUCCESS', {
        businessId,
        total,
      });

      return {
        businessId,
        total,
      };
    }, res, 'Domain count retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Count all domains (admin/reporting).
   */
  async countAllDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_COUNT_ALL');

      const filter = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const total = await this.domainRegistryService.countAllDomains(filter);

      this.logAction(req, 'DOMAINS_COUNT_ALL_SUCCESS', {
        total,
      });

      return {
        total,
      };
    }, res, 'Total domain count retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Update domain configuration.
   */
  async updateDomainConfiguration(req: DomainActionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_UPDATE_CONFIGURATION');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const updates = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {}) as UpdateDomainMappingInput;

      const domain = await this.domainRegistryService.updateDomainConfiguration(businessId, domainId, updates);

      this.logAction(req, 'DOMAINS_UPDATE_CONFIGURATION_SUCCESS', {
        businessId,
        domainId,
      });

      return { domain };
    }, res, 'Domain configuration updated successfully', this.getRequestMeta(req));
  }
}

export const domainRegistryController = new DomainRegistryController();

