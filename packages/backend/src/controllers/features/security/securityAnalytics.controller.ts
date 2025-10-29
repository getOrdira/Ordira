// src/controllers/features/security/securityAnalytics.controller.ts
// Controller for security analytics and risk detection

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';

interface SuspiciousActivityRequest extends SecurityBaseRequest {
  validatedBody: {
    userId?: string;
    userType?: string;
    ipAddress?: string;
  };
}

interface AuditReportQuery extends SecurityBaseRequest {
  validatedQuery?: {
    userId?: string;
    days?: number;
  };
}

interface SystemMetricsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    days?: number;
  };
}

/**
 * SecurityAnalyticsController exposes risk analytics backed by the security services.
 */
export class SecurityAnalyticsController extends SecurityBaseController {
  /**
   * Detect suspicious activity for a user context.
   */
  async detectSuspiciousActivity(req: SuspiciousActivityRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:analytics');

      const actor = this.resolveActor(req, {
        userId: req.validatedBody.userId,
        userType: req.validatedBody.userType as any,
      });

      const ipAddress = this.parseString(req.validatedBody.ipAddress);
      const suspicious = await this.securityServices.securityAnalyticsService.detectSuspiciousActivity(
        actor.userId,
        actor.userType,
        ipAddress,
      );

      return {
        userId: actor.userId,
        suspicious,
      };
    }, res, 'Suspicious activity evaluation completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve a security audit report for a user across a time window.
   */
  async getSecurityAuditReport(req: AuditReportQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:analytics');

      const actor = this.resolveActor(req, {
        userId: req.validatedQuery?.userId,
      });

      const days = this.parseNumber(req.validatedQuery?.days, 30, { min: 1, max: 365 });
      const report = await this.securityServices.securityAnalyticsService.getSecurityAuditReport(actor.userId, days);

      return {
        userId: actor.userId,
        days,
        report,
      };
    }, res, 'Security audit report generated', this.getRequestMeta(req));
  }

  /**
   * Retrieve system security metrics.
   */
  async getSystemSecurityMetrics(req: SystemMetricsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:analytics');

      const days = this.parseNumber(req.validatedQuery?.days, 7, { min: 1, max: 90 });
      const metrics = await this.securityServices.securityAnalyticsService.getSystemSecurityMetrics(days);

      return {
        days,
        metrics,
      };
    }, res, 'System security metrics retrieved', this.getRequestMeta(req));
  }
}

export const securityAnalyticsController = new SecurityAnalyticsController();
