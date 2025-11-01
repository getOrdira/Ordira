// src/controllers/integrations/domains/domainIntegration.controller.ts
// Controller exposing domain integration utilities for external orchestration

import { Response } from 'express';
import { DomainsIntegrationBaseController, DomainsIntegrationBaseRequest } from './domainsIntegrationBase.controller';
import type { DnsVerificationOptions } from '../../../services/domains/features/domainDns.service';

interface DomainInstructionRequest extends DomainsIntegrationBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
}

interface DomainDnsVerificationRequest extends DomainsIntegrationBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedBody?: {
    tokenOverride?: string;
    skipTxtValidation?: boolean;
  };
}

interface CertificateLifecycleRequest extends DomainsIntegrationBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedBody?: {
    requestedBy?: string;
    daysBeforeExpiry?: number;
  };
}

export class DomainIntegrationController extends DomainsIntegrationBaseController {
  /**
   * Generate DNS instructions for a mapped domain (used by registrar onboarding flows).
   */
  async getDnsInstructionSet(req: DomainInstructionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_DOMAIN_DNS_INSTRUCTIONS');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const instructions = await this.domainServices.dns.getInstructionSet(businessId, domainId);

      this.logAction(req, 'INTEGRATIONS_DOMAIN_DNS_INSTRUCTIONS_SUCCESS', {
        businessId,
        domainId
      });

      return {
        businessId,
        domainId,
        instructions
      };
    }, res, 'DNS instructions generated successfully', this.getRequestMeta(req));
  }

  /**
   * Evaluate DNS configuration without mutating persistence (useful for webhook callbacks).
   */
  async evaluateDnsRecords(req: DomainDnsVerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_DOMAIN_DNS_EVALUATE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const body = this.sanitizeInput(
        (req.validatedBody ?? (req.body as Record<string, unknown>) ?? {}) as Record<string, unknown>
      );

      const tokenOverride = this.parseString(body.tokenOverride);
      const skipTxtValidation =
        this.parseOptionalBoolean(body.skipTxtValidation) ??
        this.parseOptionalBoolean((req.query as any)?.skipTxtValidation) ??
        false;

      const mapping = await this.domainServices.registry.getDomainById(businessId, domainId);
      if (!mapping) {
        throw { statusCode: 404, message: 'Domain mapping not found' };
      }

      const options: DnsVerificationOptions = {
        tokenOverride,
        skipTxtValidation
      };

      const evaluation = await this.domainServices.dns.evaluateDomainRecords(mapping.domain, tokenOverride ?? undefined, options);

      this.logAction(req, 'INTEGRATIONS_DOMAIN_DNS_EVALUATE_SUCCESS', {
        businessId,
        domainId,
        status: evaluation.status
      });

      return {
        businessId,
        domainId,
        evaluation
      };
    }, res, 'DNS configuration evaluated successfully', this.getRequestMeta(req));
  }

  /**
   * Issue a managed certificate for a verified domain.
   */
  async issueManagedCertificate(req: CertificateLifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_DOMAIN_CERT_ISSUE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy =
        this.parseString(req.validatedBody?.requestedBy) ??
        this.parseString((req.body as any)?.requestedBy) ??
        req.userId;

      const certificate = await this.domainServices.certificateLifecycle.issueManagedCertificate(
        businessId,
        domainId,
        requestedBy
      );

      this.logAction(req, 'INTEGRATIONS_DOMAIN_CERT_ISSUE_SUCCESS', {
        businessId,
        domainId,
        expiresAt: certificate.certificate.expiresAt?.toISOString()
      });

      return {
        businessId,
        domainId,
        certificate
      };
    }, res, 'Managed certificate issued successfully', this.getRequestMeta(req));
  }

  /**
   * Schedule automatic renewal for a managed certificate.
   */
  async scheduleCertificateAutoRenewal(req: CertificateLifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_DOMAIN_CERT_AUTORENEW');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const daysBeforeExpiry = this.parseOptionalNumber(
        req.validatedBody?.daysBeforeExpiry ?? (req.body as any)?.daysBeforeExpiry,
        { min: 1, max: 60 }
      ) ?? 20;

      const schedule = await this.domainServices.certificateLifecycle.scheduleAutoRenewal(
        businessId,
        domainId,
        daysBeforeExpiry
      );

      this.logAction(req, 'INTEGRATIONS_DOMAIN_CERT_AUTORENEW_SUCCESS', {
        businessId,
        domainId,
        daysBeforeExpiry,
        scheduled: Boolean(schedule)
      });

      return {
        businessId,
        domainId,
        schedule
      };
    }, res, 'Certificate auto-renewal scheduled successfully', this.getRequestMeta(req));
  }

  /**
   * Provide a certificate summary for external monitoring systems.
   */
  async getCertificateSummary(req: DomainInstructionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'INTEGRATIONS_DOMAIN_CERT_SUMMARY');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const summary = await this.domainServices.certificateLifecycle.getCertificateSummary(businessId, domainId);

      this.logAction(req, 'INTEGRATIONS_DOMAIN_CERT_SUMMARY_SUCCESS', {
        businessId,
        domainId,
        status: summary.status
      });

      return {
        businessId,
        domainId,
        summary: {
          ...summary,
          expiresAt: summary.expiresAt ? summary.expiresAt.toISOString() : undefined
        }
      };
    }, res, 'Certificate summary retrieved successfully', this.getRequestMeta(req));
  }
}

export const domainIntegrationController = new DomainIntegrationController();

