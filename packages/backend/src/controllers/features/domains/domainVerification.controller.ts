// src/controllers/features/domains/domainVerification.controller.ts
// Controller exposing domain verification workflows

import { Response } from 'express';
import { DomainsBaseController, DomainsBaseRequest } from './domainsBase.controller';
import type { VerificationInitiationOptions } from '../../../services/domains/features/domainVerification.service';

interface VerificationRequest extends DomainsBaseRequest {
  validatedParams?: {
    businessId?: string;
    domainId?: string;
  };
  validatedBody?: {
    businessId?: string;
    domainId?: string;
    method?: string;
    requestedBy?: string;
    autoScheduleRecheck?: boolean;
  };
  validatedQuery?: {
    businessId?: string;
    domainId?: string;
  };
}

/**
 * DomainVerificationController maps HTTP requests to the domain verification service.
 */
export class DomainVerificationController extends DomainsBaseController {
  /**
   * Initiate verification for a domain.
   */
  async initiateVerification(req: VerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_VERIFICATION_INIT');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const body = req.validatedBody ?? (req.body as any) ?? {};

      const options: VerificationInitiationOptions = {
        method: this.parseString(body.method) as VerificationInitiationOptions['method'],
        requestedBy: this.parseString(body.requestedBy) ?? req.userId,
        autoScheduleRecheck: body.autoScheduleRecheck !== undefined ? this.parseBoolean(body.autoScheduleRecheck) : undefined,
      };

      const status = await this.domainVerificationService.initiateVerification(businessId, domainId, options);

      this.logAction(req, 'DOMAINS_VERIFICATION_INIT_SUCCESS', {
        businessId,
        domainId,
        method: status.method,
      });

      return { status };
    }, res, 'Domain verification initiated successfully', this.getRequestMeta(req));
  }

  /**
   * Verify a domain (performs DNS checks when applicable).
   */
  async verifyDomain(req: VerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_VERIFICATION_VERIFY');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const requestedBy = this.parseString(
        req.validatedBody?.requestedBy ??
          (req.body as any)?.requestedBy ??
          req.validatedQuery?.requestedBy,
      ) ?? req.userId;

      const result = await this.domainVerificationService.verifyDomain(businessId, domainId, requestedBy);

      this.logAction(req, 'DOMAINS_VERIFICATION_VERIFY_SUCCESS', {
        businessId,
        domainId,
        method: result.method,
        verified: result.verified,
      });

      return { result };
    }, res, 'Domain verification completed successfully', this.getRequestMeta(req));
  }

  /**
   * Mark a domain as verified manually.
   */
  async markVerified(req: VerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_VERIFICATION_MARK_VERIFIED');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const verifiedBy = this.parseString(
        req.validatedBody?.verifiedBy ??
          (req.body as any)?.verifiedBy ??
          req.validatedQuery?.verifiedBy,
      ) ?? req.userId;

      await this.domainVerificationService.markVerified(businessId, domainId, verifiedBy);

      this.logAction(req, 'DOMAINS_VERIFICATION_MARK_VERIFIED_SUCCESS', {
        businessId,
        domainId,
      });

      return {
        businessId,
        domainId,
        verified: true,
      };
    }, res, 'Domain marked as verified successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve verification status for a domain.
   */
  async getVerificationStatus(req: VerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_VERIFICATION_STATUS');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);

      const status = await this.domainVerificationService.getVerificationStatus(businessId, domainId);

      this.logAction(req, 'DOMAINS_VERIFICATION_STATUS_SUCCESS', {
        businessId,
        domainId,
        verified: status.isVerified,
        method: status.method,
      });

      return { status };
    }, res, 'Domain verification status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Schedule a verification recheck job.
   */
  async scheduleVerificationRecheck(req: VerificationRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'DOMAINS_VERIFICATION_SCHEDULE_RECHECK');

      const businessId = this.requireBusinessId(req);
      const domainId = this.requireDomainId(req);
      const method = this.parseString(
        req.validatedBody?.method ??
          (req.body as any)?.method ??
          req.validatedQuery?.method,
      ) as VerificationInitiationOptions['method'] | undefined;

      await this.domainVerificationService.scheduleRecheckJob({
        businessId,
        domainId,
        method: method ?? 'dns',
      });

      this.logAction(req, 'DOMAINS_VERIFICATION_SCHEDULE_RECHECK_SUCCESS', {
        businessId,
        domainId,
        method: method ?? 'dns',
      });

      return {
        businessId,
        domainId,
        scheduled: true,
      };
    }, res, 'Domain verification recheck scheduled successfully', this.getRequestMeta(req));
  }
}

export const domainVerificationController = new DomainVerificationController();

