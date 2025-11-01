// src/controllers/middleware/securityValidation.controller.ts
// Controller exposing security validation diagnostics and controls

import { Response } from 'express';
import { MiddlewareBaseController, MiddlewareBaseRequest } from './middlewareBase.controller';

/**
 * SecurityValidationController provides visibility into security validation activity.
 */
export class SecurityValidationController extends MiddlewareBaseController {
  /**
   * Retrieve aggregated security validation statistics.
   */
  async getSecurityStats(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_SECURITY_STATS');

      const stats = this.securityValidation.getSecurityStats();

      this.logAction(req, 'MIDDLEWARE_SECURITY_STATS_SUCCESS', stats);

      return {
        stats
      };
    }, res, 'Security validation statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Clear tracked security data (useful for testing or after incident review).
   */
  async clearSecurityData(req: MiddlewareBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'MIDDLEWARE_SECURITY_CLEAR');

      this.securityValidation.clearSecurityData();

      this.logAction(req, 'MIDDLEWARE_SECURITY_CLEAR_SUCCESS');

      return {
        cleared: true,
        clearedAt: new Date().toISOString()
      };
    }, res, 'Security validation data cleared successfully', this.getRequestMeta(req));
  }
}

export const securityValidationController = new SecurityValidationController();

