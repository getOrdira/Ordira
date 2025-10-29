// src/controllers/features/domains/domainStorage.controller.ts
// Controller exposing low-level domain storage operations

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type {
  CreateDomainMappingInput,
  UpdateDomainMappingInput,
  ManagedCertificatePersistence,
} from '../../../services/domains/core/domainStorage.service';

interface DomainStorageRequest extends DomainsBaseRequest {
  validatedBody?: any;
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
    domain?: string;
  };
}

/**
 * DomainStorageController maps raw persistence operations to the domain storage service.
 */
export class DomainStorageController extends DomainsBaseController {
  /**
   * Create a domain mapping record directly.
   */
  async createDomainMapping(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_CREATE');

      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const businessId = this.parseString(body.businessId) ?? this.requireBusinessId(req);
      const domain = this.parseString(body.domain) ?? this.requireDomainName(req);
      const createdBy = this.parseString(body.createdBy) ?? req.userId ?? 'system';

      const input: CreateDomainMappingInput = {
        businessId,
        domain,
        certificateType: this.parseString(body.certificateType) as CreateDomainMappingInput['certificateType'],
        forceHttps: body.forceHttps !== undefined ? this.parseBoolean(body.forceHttps) : undefined,
        autoRenewal: body.autoRenewal !== undefined ? this.parseBoolean(body.autoRenewal) : undefined,
        planLevel: this.parseString(body.planLevel) as CreateDomainMappingInput['planLevel'],
        createdBy,
        verificationMethod: this.parseString(body.verificationMethod) as CreateDomainMappingInput['verificationMethod'],
        dnsRecords: body.dnsRecords,
        metadata: body.metadata,
      };

      const domainRecord = await this.domainStorageService.createDomainMapping(input);

      this.logAction(req, 'DOMAINS_STORAGE_CREATE_SUCCESS', {
        businessId,
        domain: domainRecord.domain,
      });

      return { domain: domainRecord };
    }, res, 'Domain mapping created successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve a domain mapping by identifier.
   */
  async getDomainById(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_GET_BY_ID');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const domain = await this.domainStorageService.getDomainById(businessId, domainId);
      if (!domain) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_STORAGE_GET_BY_ID_SUCCESS', {
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
  async getDomainByDomain(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_GET_BY_DOMAIN');

      const businessId = this.requireBusinessId(req);
      const domain = this.requireDomainName(req);

      const mapping = await this.domainStorageService.getDomainByDomain(businessId, domain);
      if (!mapping) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_STORAGE_GET_BY_DOMAIN_SUCCESS', {
        businessId,
        domain,
      });

      return { domain: mapping };
    }, res, 'Domain mapping retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * List domain mappings for a business.
   */
  async listDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_LIST');

      const businessId = this.requireBusinessId(req);
      const filter = this.sanitizeInput(req.validatedQuery ?? (req.query as any) ?? {});

      const domains = await this.domainStorageService.listDomains(businessId, filter);

      this.logAction(req, 'DOMAINS_STORAGE_LIST_SUCCESS', {
        businessId,
        count: domains.length,
      });

      return {
        domains,
        total: domains.length,
      };
    }, res, 'Domain mappings listed successfully', this.getRequestMeta(req));
  }

  /**
   * Update a domain mapping.
   */
  async updateDomainMapping(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_UPDATE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const updates = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {}) as UpdateDomainMappingInput;

      const domain = await this.domainStorageService.updateDomainMapping(businessId, domainId, updates);

      this.logAction(req, 'DOMAINS_STORAGE_UPDATE_SUCCESS', {
        businessId,
        domainId,
      });

      return { domain };
    }, res, 'Domain mapping updated successfully', this.getRequestMeta(req));
  }

  /**
   * Delete a domain mapping.
   */
  async deleteDomainMapping(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_DELETE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const deleted = await this.domainStorageService.deleteDomainMapping(businessId, domainId);
      if (!deleted) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      this.logAction(req, 'DOMAINS_STORAGE_DELETE_SUCCESS', {
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
   * Record managed certificate metadata.
   */
  async recordManagedCertificate(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_RECORD_CERT');

      const body = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const payload: ManagedCertificatePersistence = {
        businessId: this.parseString(body.businessId) ?? this.requireBusinessId(req),
        domainId: this.parseString(body.domainId) ?? this.requireDomainId(req),
        certificateType: this.parseString(body.certificateType) as ManagedCertificatePersistence['certificateType'],
        issuer: this.parseString(body.issuer),
        validFrom: this.parseDate(body.validFrom),
        validTo: this.parseDate(body.validTo),
        serialNumber: this.parseString(body.serialNumber),
        renewedBy: this.parseString(body.renewedBy),
        sslStatus: this.parseString(body.sslStatus) as ManagedCertificatePersistence['sslStatus'],
        autoRenewal: body.autoRenewal !== undefined ? this.parseBoolean(body.autoRenewal) : undefined,
      };

      const domain = await this.domainStorageService.recordManagedCertificate(payload);

      this.logAction(req, 'DOMAINS_STORAGE_RECORD_CERT_SUCCESS', {
        businessId: payload.businessId,
        domainId: payload.domainId,
      });

      return { domain };
    }, res, 'Managed certificate metadata recorded successfully', this.getRequestMeta(req));
  }

  /**
   * Clear managed certificate metadata for a domain.
   */
  async clearManagedCertificate(req: DomainStorageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_CLEAR_CERT');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const domain = await this.domainStorageService.clearManagedCertificate(businessId, domainId);

      this.logAction(req, 'DOMAINS_STORAGE_CLEAR_CERT_SUCCESS', {
        businessId,
        domainId,
      });

      return { domain };
    }, res, 'Managed certificate metadata cleared successfully', this.getRequestMeta(req));
  }

  /**
   * Count domains for a business.
   */
  async countDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_COUNT');

      const businessId = this.requireBusinessId(req);
      const total = await this.domainStorageService.countDomains(businessId);

      this.logAction(req, 'DOMAINS_STORAGE_COUNT_SUCCESS', {
        businessId,
        total,
      });

      return { businessId, total };
    }, res, 'Domain count retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Count all domains with optional filter.
   */
  async countAllDomains(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_STORAGE_COUNT_ALL');

      const filter = this.sanitizeInput(req.validatedBody ?? (req.body as any) ?? {});
      const total = await this.domainStorageService.countAllDomains(filter);

      this.logAction(req, 'DOMAINS_STORAGE_COUNT_ALL_SUCCESS', {
        total,
      });

      return { total };
    }, res, 'Total domain count retrieved successfully', this.getRequestMeta(req));
  }
}

export const domainStorageController = new DomainStorageController();

