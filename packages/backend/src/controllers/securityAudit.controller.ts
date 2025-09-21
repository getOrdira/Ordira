// src/controllers/securityAudit.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { requirePermission } from '../middleware/unifiedAuth.middleware';
import { SecurityAuditService } from '../services/security/securityAudit.service';
import { getSecurityAuditService } from '../services/container.service';
import { sendSuccess, sendError, ResponseHelper } from '../utils/responseUtils';

/**
 * Security audit controller
 */
export class SecurityAuditController {
  private securityAuditService: SecurityAuditService;

  constructor() {
    this.securityAuditService = getSecurityAuditService();
  }

  /**
   * Perform comprehensive security audit
   */
  public async performSecurityAudit(
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const responseHelper = new ResponseHelper(res);
      
      // Check permissions
      if (!req.tokenPayload?.permissions?.includes('security:audit') && 
          !req.tokenPayload?.permissions?.includes('*')) {
        responseHelper.forbidden('Insufficient permissions for security audit');
        return;
      }

      const auditResult = await this.securityAuditService.performSecurityAudit();
      
      responseHelper.success(auditResult, 'Security audit completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate security report
   */
  public async generateSecurityReport(
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const responseHelper = new ResponseHelper(res);
      
      // Check permissions
      if (!req.tokenPayload?.permissions?.includes('security:audit') && 
          !req.tokenPayload?.permissions?.includes('*')) {
        responseHelper.forbidden('Insufficient permissions for security report');
        return;
      }

      const report = await this.securityAuditService.generateSecurityReport();
      
      // Set content type for markdown
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="security-report.md"');
      res.send(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Audit specific request
   */
  public async auditRequest(
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const responseHelper = new ResponseHelper(res);
      
      // Check permissions
      if (!req.tokenPayload?.permissions?.includes('security:audit') && 
          !req.tokenPayload?.permissions?.includes('*')) {
        responseHelper.forbidden('Insufficient permissions for request audit');
        return;
      }

      const issues = await this.securityAuditService.auditRequest(req, res);
      
      responseHelper.success({
        issues,
        requestId: responseHelper.getRequestId(),
        timestamp: new Date().toISOString()
      }, 'Request audit completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security audit history
   */
  public async getAuditHistory(
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const responseHelper = new ResponseHelper(res);
      
      // Check permissions
      if (!req.tokenPayload?.permissions?.includes('security:audit') && 
          !req.tokenPayload?.permissions?.includes('*')) {
        responseHelper.forbidden('Insufficient permissions for audit history');
        return;
      }

      // This would typically come from a database
      const auditHistory = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          score: 85,
          passed: true,
          issuesCount: 3
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          score: 78,
          passed: false,
          issuesCount: 5
        }
      ];

      responseHelper.success(auditHistory, 'Audit history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security metrics
   */
  public async getSecurityMetrics(
    req: UnifiedAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const responseHelper = new ResponseHelper(res);
      
      // Check permissions
      if (!req.tokenPayload?.permissions?.includes('security:metrics') && 
          !req.tokenPayload?.permissions?.includes('*')) {
        responseHelper.forbidden('Insufficient permissions for security metrics');
        return;
      }

      // Mock security metrics - in production, these would come from monitoring systems
      const metrics = {
        totalRequests: 12543,
        failedAuthentications: 23,
        rateLimitHits: 156,
        suspiciousRequests: 8,
        tokenRefreshRate: 0.15,
        averageSessionDuration: 1800, // 30 minutes
        securityScore: 85,
        lastAudit: new Date().toISOString(),
        criticalIssues: 0,
        highIssues: 2,
        mediumIssues: 5,
        lowIssues: 3
      };

      responseHelper.success(metrics, 'Security metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default SecurityAuditController;
