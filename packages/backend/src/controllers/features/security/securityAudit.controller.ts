// src/controllers/features/security/securityAudit.controller.ts
// Controller orchestrating security audit operations

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';

interface AuditHistoryQuery extends SecurityBaseRequest {
  validatedQuery?: {
    limit?: number;
  };
}

interface SecurityMetricsQuery extends SecurityBaseRequest {
  validatedQuery?: {
    days?: number;
  };
}

/**
 * SecurityAuditController exposes audit routines backed by the modular security services.
 */
export class SecurityAuditController extends SecurityBaseController {
  /**
   * Run a comprehensive security audit and return the results.
   */
  async performSecurityAudit(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:audit');

      const audit = await this.securityAuditService.performSecurityAudit();

      return { audit };
    }, res, 'Security audit completed successfully', this.getRequestMeta(req));
  }

  /**
   * Generate a markdown security report attachment.
   */
  async generateSecurityReport(req: SecurityBaseRequest, res: Response): Promise<void> {
    try {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:audit');

      const report = await this.securityAuditService.generateSecurityReport();

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="security-report.md"');
      res.send(report);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }

  /**
   * Audit the current request for potential issues.
   */
  async auditRequest(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:audit');

      const issues = await this.securityAuditService.auditRequest(req as any, res);

      return {
        issues,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      };
    }, res, 'Request audit completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent security audit history derived from scan results.
   */
  async getAuditHistory(req: AuditHistoryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:audit');

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 100 });
      const history = await this.securityServices.securityScanningService.getScanHistory(limit);

      return {
        history,
        retrievedAt: new Date().toISOString(),
      };
    }, res, 'Security audit history retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve system-wide security metrics for dashboards.
   */
  async getSecurityMetrics(req: SecurityMetricsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:analytics');

      const days = this.parseNumber(req.validatedQuery?.days, 7, { min: 1, max: 90 });
      const metrics = await this.securityServices.securityAnalyticsService.getSystemSecurityMetrics(days);

      return {
        metrics,
        windowDays: days,
        generatedAt: new Date().toISOString(),
      };
    }, res, 'Security metrics retrieved', this.getRequestMeta(req));
  }
}

export const securityAuditController = new SecurityAuditController();
