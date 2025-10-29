// src/controllers/features/domains/domainCertificateProvisioner.controller.ts
// Controller exposing direct certificate provisioning operations

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';

interface CertificateRequest extends DomainsBaseRequest {
  validatedBody?: {
    hostname?: string;
    domain?: string;
    useStaging?: boolean;
  };
  validatedParams?: {
    hostname?: string;
  };
  validatedQuery?: {
    hostname?: string;
  };
}

/**
 * DomainCertificateProvisionerController maps direct certificate operations to the provisioner service.
 */
export class DomainCertificateProvisionerController extends DomainsBaseController {
  /**
   * Provision a certificate for a hostname.
   */
  async provisionCertificate(req: CertificateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERT_PROVISION');

      const hostname = this.requireDomainName(req);
      const result = await this.certificateProvisionerService.provisionCertificate(hostname);

      this.logAction(req, 'DOMAINS_CERT_PROVISION_SUCCESS', {
        hostname,
        expiresAt: result.expiresAt?.toISOString(),
      });

      return {
        hostname,
        certificate: result,
      };
    }, res, 'Certificate provisioned successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve certificate metadata for a hostname.
   */
  async getCertificateInfo(req: CertificateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERT_INFO');

      const hostname = this.requireDomainName(req);
      const info = await this.certificateProvisionerService.getCertificateInfo(hostname);

      this.logAction(req, 'DOMAINS_CERT_INFO_SUCCESS', {
        hostname,
        exists: info.exists,
      });

      return {
        hostname,
        certificate: info,
      };
    }, res, 'Certificate info retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Renew a certificate for a hostname.
   */
  async renewCertificate(req: CertificateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERT_RENEW');

      const hostname = this.requireDomainName(req);
      const result = await this.certificateProvisionerService.renewCertificate(hostname);

      this.logAction(req, 'DOMAINS_CERT_RENEW_SUCCESS', {
        hostname,
        expiresAt: result.expiresAt?.toISOString(),
      });

      return {
        hostname,
        certificate: result,
      };
    }, res, 'Certificate renewed successfully', this.getRequestMeta(req));
  }

  /**
   * Revoke a certificate for a hostname.
   */
  async revokeCertificate(req: CertificateRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERT_REVOKE');

      const hostname = this.requireDomainName(req);
      await this.certificateProvisionerService.revokeCertificate(hostname);

      this.logAction(req, 'DOMAINS_CERT_REVOKE_SUCCESS', {
        hostname,
      });

      return {
        hostname,
        revoked: true,
      };
    }, res, 'Certificate revoked successfully', this.getRequestMeta(req));
  }

  /**
   * List provisioned certificates on disk.
   */
  async listCertificates(req: DomainsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_CERT_LIST');

      const certificates = await this.certificateProvisionerService.listCertificates();

      this.logAction(req, 'DOMAINS_CERT_LIST_SUCCESS', {
        total: certificates.length,
      });

      return {
        certificates,
        total: certificates.length,
      };
    }, res, 'Certificates listed successfully', this.getRequestMeta(req));
  }
}

export const domainCertificateProvisionerController = new DomainCertificateProvisionerController();

