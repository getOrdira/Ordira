// src/controllers/features/domains/domainCertificateLifecycle.controller.ts
// Controller mapping certificate lifecycle workflows to the lifecycle service

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';

interface LifecycleRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedBody?: {
    businessId?: string;
    domainId?: string;
    requestedBy?: string;
    daysBeforeExpiry?: number;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
  };
}

/**
 * DomainCertificateLifecycleController maps lifecycle endpoints to the domain certificate lifecycle service.
 */
export class DomainCertificateLifecycleController extends DomainsBaseController {
  /**
   * Issue a managed certificate.
   */
  async issueManagedCertificate(req: LifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIFECYCLE_ISSUE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy = this.parseString(
        req.validatedBody?.requestedBy ?? (req.body as any)?.requestedBy,
      ) ?? req.userId;

      const result = await this.domainCertificateLifecycleService.issueManagedCertificate(
        businessId,
        domainId,
        requestedBy,
      );

      this.logAction(req, 'DOMAINS_LIFECYCLE_ISSUE_SUCCESS', {
        businessId,
        domainId,
        expiresAt: result.certificate.expiresAt?.toISOString(),
      });

      return { result };
    }, res, 'Managed certificate issued successfully', this.getRequestMeta(req));
  }

  /**
   * Renew a managed certificate.
   */
  async renewManagedCertificate(req: LifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIFECYCLE_RENEW');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy = this.parseString(
        req.validatedBody?.requestedBy ?? (req.body as any)?.requestedBy,
      ) ?? req.userId;

      const result = await this.domainCertificateLifecycleService.renewManagedCertificate(
        businessId,
        domainId,
        requestedBy,
      );

      this.logAction(req, 'DOMAINS_LIFECYCLE_RENEW_SUCCESS', {
        businessId,
        domainId,
        expiresAt: result.certificate.expiresAt?.toISOString(),
      });

      return { result };
    }, res, 'Managed certificate renewed successfully', this.getRequestMeta(req));
  }

  /**
   * Revoke a managed certificate.
   */
  async revokeManagedCertificate(req: LifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIFECYCLE_REVOKE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const domain = await this.domainCertificateLifecycleService.revokeManagedCertificate(businessId, domainId);

      this.logAction(req, 'DOMAINS_LIFECYCLE_REVOKE_SUCCESS', {
        businessId,
        domainId,
      });

      return { domain };
    }, res, 'Managed certificate revoked successfully', this.getRequestMeta(req));
  }

  /**
   * Schedule auto-renewal job.
   */
  async scheduleAutoRenewal(req: LifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIFECYCLE_SCHEDULE');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const body = req.validatedBody ?? (req.body as any) ?? {};
      const daysBeforeExpiry = this.parseOptionalNumber(body.daysBeforeExpiry, { min: 1, max: 60 }) ?? 20;

      const schedule = await this.domainCertificateLifecycleService.scheduleAutoRenewal(
        businessId,
        domainId,
        daysBeforeExpiry,
      );

      this.logAction(req, 'DOMAINS_LIFECYCLE_SCHEDULE_SUCCESS', {
        businessId,
        domainId,
        scheduled: Boolean(schedule),
      });

      return {
        schedule,
      };
    }, res, 'Certificate auto-renewal scheduling completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve certificate summary.
   */
  async getCertificateSummary(req: LifecycleRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_LIFECYCLE_SUMMARY');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const summary = await this.domainCertificateLifecycleService.getCertificateSummary(businessId, domainId);

      this.logAction(req, 'DOMAINS_LIFECYCLE_SUMMARY_SUCCESS', {
        businessId,
        domainId,
        expiresAt: summary.expiresAt?.toISOString(),
      });

      return { summary };
    }, res, 'Certificate summary retrieved successfully', this.getRequestMeta(req));
  }
}

export const domainCertificateLifecycleController = new DomainCertificateLifecycleController();

