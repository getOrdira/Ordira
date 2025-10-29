// src/controllers/features/security/securityScanning.controller.ts
// Controller wrapping automated security scanning services

import { Response } from 'express';
import { SecurityBaseController, SecurityBaseRequest } from './securityBase.controller';

interface ScanHistoryQuery extends SecurityBaseRequest {
  validatedQuery?: {
    limit?: number;
  };
}

/**
 * SecurityScanningController exposes endpoints to trigger and inspect security scans.
 */
export class SecurityScanningController extends SecurityBaseController {
  /**
   * Perform a comprehensive security scan.
   */
  async performSecurityScan(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:scan');

      const result = await this.securityServices.securityScanningService.performSecurityScan();

      return {
        result,
        startedBy: req.userId,
      };
    }, res, 'Security scan execution completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve aggregate scan metrics.
   */
  async getSecurityScanMetrics(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:scan');

      const metrics = await this.securityServices.securityScanningService.getSecurityScanMetrics();

      return {
        metrics,
        generatedAt: new Date().toISOString(),
      };
    }, res, 'Security scan metrics retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve scan history entries.
   */
  async getScanHistory(req: ScanHistoryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:scan');

      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 100 });
      const history = await this.securityServices.securityScanningService.getScanHistory(limit);

      return {
        history,
        limit,
      };
    }, res, 'Security scan history retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve unresolved vulnerabilities.
   */
  async getUnresolvedVulnerabilities(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:scan');

      const vulnerabilities = await this.securityServices.securityScanningService.getUnresolvedVulnerabilities();

      return {
        vulnerabilities,
        count: vulnerabilities.length,
      };
    }, res, 'Unresolved vulnerabilities retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve current scan status.
   */
  async getScanStatus(req: SecurityBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);
      this.ensureSecurityPermission(req, 'security:scan');

      const scanningService = this.securityServices.securityScanningService;

      return {
        inProgress: scanningService.isScanInProgress(),
        lastScanTime: scanningService.getLastScanTime()?.toISOString() ?? null,
      };
    }, res, 'Security scan status retrieved', this.getRequestMeta(req));
  }
}

export const securityScanningController = new SecurityScanningController();
