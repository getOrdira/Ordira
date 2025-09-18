// src/services/security/securityAudit.service.ts
import { Request, Response } from 'express';
import { UnifiedAuthRequest } from '../../middleware/unifiedAuth.middleware';
import { Manufacturer } from '../../models/manufacturer.model';
import { Business } from '../../models/business.model';
import { User } from '../../models/user.model';

/**
 * Security audit result interface
 */
export interface SecurityAuditResult {
  passed: boolean;
  score: number; // 0-100
  issues: SecurityIssue[];
  recommendations: string[];
  timestamp: string;
}

/**
 * Security issue interface
 */
export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  recommendation: string;
  affectedEndpoint?: string;
}

/**
 * Authentication security audit interface
 */
export interface AuthSecurityAudit {
  tokenValidation: boolean;
  userExistence: boolean;
  accountStatus: boolean;
  sessionManagement: boolean;
  permissionValidation: boolean;
  rateLimiting: boolean;
  ipValidation: boolean;
  deviceFingerprinting: boolean;
}

/**
 * Comprehensive security audit service
 */
export class SecurityAuditService {
  private static instance: SecurityAuditService;

  private constructor() {}

  public static getInstance(): SecurityAuditService {
    if (!SecurityAuditService.instance) {
      SecurityAuditService.instance = new SecurityAuditService();
    }
    return SecurityAuditService.instance;
  }

  /**
   * Perform comprehensive security audit
   */
  public async performSecurityAudit(): Promise<SecurityAuditResult> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Authentication security audit
    const authAudit = await this.auditAuthenticationSecurity();
    issues.push(...authAudit.issues);
    recommendations.push(...authAudit.recommendations);
    score -= authAudit.scoreDeduction;

    // Session management audit
    const sessionAudit = await this.auditSessionManagement();
    issues.push(...sessionAudit.issues);
    recommendations.push(...sessionAudit.recommendations);
    score -= sessionAudit.scoreDeduction;

    // Token lifecycle audit
    const tokenAudit = await this.auditTokenLifecycle();
    issues.push(...tokenAudit.issues);
    recommendations.push(...tokenAudit.recommendations);
    score -= tokenAudit.scoreDeduction;

    // Error handling audit
    const errorAudit = await this.auditErrorHandling();
    issues.push(...errorAudit.issues);
    recommendations.push(...errorAudit.recommendations);
    score -= errorAudit.scoreDeduction;

    // Rate limiting audit
    const rateLimitAudit = await this.auditRateLimiting();
    issues.push(...rateLimitAudit.issues);
    recommendations.push(...rateLimitAudit.recommendations);
    score -= rateLimitAudit.scoreDeduction;

    // Data exposure audit
    const dataAudit = await this.auditDataExposure();
    issues.push(...dataAudit.issues);
    recommendations.push(...dataAudit.recommendations);
    score -= dataAudit.scoreDeduction;

    return {
      passed: score >= 80,
      score: Math.max(0, score),
      issues,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Audit authentication security
   */
  private async auditAuthenticationSecurity(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check for hardcoded secrets
    if (process.env.JWT_SECRET === 'your-secret-key' || !process.env.JWT_SECRET) {
      issues.push({
        severity: 'critical',
        category: 'Authentication',
        description: 'JWT secret is not properly configured',
        recommendation: 'Set a strong, unique JWT_SECRET environment variable'
      });
      scoreDeduction += 20;
    }

    // Check token configuration
    const tokenExpiry = process.env.JWT_ACCESS_EXPIRY;
    if (!tokenExpiry || tokenExpiry === '24h') {
      issues.push({
        severity: 'medium',
        category: 'Authentication',
        description: 'Access token expiry is too long or not configured',
        recommendation: 'Set JWT_ACCESS_EXPIRY to 15m or less for better security'
      });
      scoreDeduction += 10;
    }

    // Check refresh token configuration
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY;
    if (!refreshExpiry || refreshExpiry === '30d') {
      issues.push({
        severity: 'medium',
        category: 'Authentication',
        description: 'Refresh token expiry is too long',
        recommendation: 'Set JWT_REFRESH_EXPIRY to 7d or less'
      });
      scoreDeduction += 5;
    }

    // Check for missing issuer/audience validation
    if (!process.env.JWT_ISSUER || !process.env.JWT_AUDIENCE) {
      issues.push({
        severity: 'high',
        category: 'Authentication',
        description: 'JWT issuer or audience validation is missing',
        recommendation: 'Set JWT_ISSUER and JWT_AUDIENCE environment variables'
      });
      scoreDeduction += 15;
    }

    recommendations.push('Implement multi-factor authentication for admin accounts');
    recommendations.push('Add device fingerprinting for enhanced security');
    recommendations.push('Implement account lockout after failed login attempts');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit session management
   */
  private async auditSessionManagement(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check Redis configuration for session storage
    if (!process.env.REDIS_URL) {
      issues.push({
        severity: 'high',
        category: 'Session Management',
        description: 'Redis is not configured for session storage',
        recommendation: 'Configure Redis for secure session management'
      });
      scoreDeduction += 15;
    }

    // Check session timeout configuration
    const sessionTimeout = process.env.SESSION_TIMEOUT;
    if (!sessionTimeout || parseInt(sessionTimeout) > 3600) {
      issues.push({
        severity: 'medium',
        category: 'Session Management',
        description: 'Session timeout is too long or not configured',
        recommendation: 'Set SESSION_TIMEOUT to 1 hour or less'
      });
      scoreDeduction += 10;
    }

    recommendations.push('Implement session invalidation on password change');
    recommendations.push('Add concurrent session limit per user');
    recommendations.push('Implement session activity monitoring');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit token lifecycle management
   */
  private async auditTokenLifecycle(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check for token blacklisting mechanism
    if (!process.env.REDIS_URL) {
      issues.push({
        severity: 'high',
        category: 'Token Lifecycle',
        description: 'Token blacklisting mechanism is not available',
        recommendation: 'Implement Redis-based token blacklisting'
      });
      scoreDeduction += 15;
    }

    // Check token rotation implementation
    const hasRefreshEndpoint = true; // This should be checked against actual routes
    if (!hasRefreshEndpoint) {
      issues.push({
        severity: 'medium',
        category: 'Token Lifecycle',
        description: 'Token refresh endpoint is not implemented',
        recommendation: 'Implement secure token refresh mechanism'
      });
      scoreDeduction += 10;
    }

    recommendations.push('Implement automatic token rotation');
    recommendations.push('Add token usage analytics');
    recommendations.push('Implement token revocation on security events');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit error handling
   */
  private async auditErrorHandling(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check for information disclosure in error messages
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      issues.push({
        severity: 'medium',
        category: 'Error Handling',
        description: 'Application is not running in production mode',
        recommendation: 'Ensure NODE_ENV is set to production in production environment'
      });
      scoreDeduction += 5;
    }

    // Check for standardized error responses
    issues.push({
      severity: 'low',
      category: 'Error Handling',
      description: 'Error response format should be standardized',
      recommendation: 'Use standardized error response format across all endpoints'
    });
    scoreDeduction += 5;

    recommendations.push('Implement error rate monitoring');
    recommendations.push('Add error correlation IDs');
    recommendations.push('Implement error alerting for critical issues');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit rate limiting
   */
  private async auditRateLimiting(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check rate limiting configuration
    const rateLimitConfig = process.env.RATE_LIMIT_WINDOW;
    if (!rateLimitConfig) {
      issues.push({
        severity: 'high',
        category: 'Rate Limiting',
        description: 'Rate limiting is not properly configured',
        recommendation: 'Configure rate limiting for all endpoints'
      });
      scoreDeduction += 15;
    }

    recommendations.push('Implement adaptive rate limiting');
    recommendations.push('Add rate limiting per user type');
    recommendations.push('Implement rate limiting bypass for trusted IPs');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit data exposure
   */
  private async auditDataExposure(): Promise<{
    issues: SecurityIssue[];
    recommendations: string[];
    scoreDeduction: number;
  }> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];
    let scoreDeduction = 0;

    // Check for sensitive data in logs
    const logLevel = process.env.LOG_LEVEL;
    if (logLevel === 'debug' || !logLevel) {
      issues.push({
        severity: 'medium',
        category: 'Data Exposure',
        description: 'Log level may expose sensitive information',
        recommendation: 'Set LOG_LEVEL to info or warn in production'
      });
      scoreDeduction += 10;
    }

    // Check for CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin || corsOrigin === '*') {
      issues.push({
        severity: 'high',
        category: 'Data Exposure',
        description: 'CORS is configured to allow all origins',
        recommendation: 'Configure specific CORS origins for production'
      });
      scoreDeduction += 15;
    }

    recommendations.push('Implement data encryption at rest');
    recommendations.push('Add data access logging');
    recommendations.push('Implement data retention policies');

    return { issues, recommendations, scoreDeduction };
  }

  /**
   * Audit specific request for security issues
   */
  public async auditRequest(req: UnifiedAuthRequest, res: Response): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check for suspicious headers
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
      issues.push({
        severity: 'low',
        category: 'Request Validation',
        description: 'Suspicious or missing User-Agent header',
        recommendation: 'Validate User-Agent headers'
      });
    }

    // Check for IP validation
    const ip = req.ip;
    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      issues.push({
        severity: 'medium',
        category: 'Request Validation',
        description: 'Request from localhost or invalid IP',
        recommendation: 'Implement IP validation and geolocation checks'
      });
    }

    // Check for token validation
    if (req.tokenPayload) {
      const tokenAge = Date.now() / 1000 - req.tokenPayload.iat;
      if (tokenAge > 86400) { // 24 hours
        issues.push({
          severity: 'medium',
          category: 'Token Validation',
          description: 'Token is older than 24 hours',
          recommendation: 'Implement token refresh mechanism'
        });
      }
    }

    return issues;
  }

  /**
   * Generate security report
   */
  public async generateSecurityReport(): Promise<string> {
    const audit = await this.performSecurityAudit();
    
    let report = `# Security Audit Report\n\n`;
    report += `**Generated:** ${audit.timestamp}\n`;
    report += `**Overall Score:** ${audit.score}/100\n`;
    report += `**Status:** ${audit.passed ? 'PASSED' : 'FAILED'}\n\n`;

    if (audit.issues.length > 0) {
      report += `## Security Issues (${audit.issues.length})\n\n`;
      
      const criticalIssues = audit.issues.filter(i => i.severity === 'critical');
      const highIssues = audit.issues.filter(i => i.severity === 'high');
      const mediumIssues = audit.issues.filter(i => i.severity === 'medium');
      const lowIssues = audit.issues.filter(i => i.severity === 'low');

      if (criticalIssues.length > 0) {
        report += `### Critical Issues (${criticalIssues.length})\n`;
        criticalIssues.forEach(issue => {
          report += `- **${issue.category}:** ${issue.description}\n`;
          report += `  - Recommendation: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }

      if (highIssues.length > 0) {
        report += `### High Priority Issues (${highIssues.length})\n`;
        highIssues.forEach(issue => {
          report += `- **${issue.category}:** ${issue.description}\n`;
          report += `  - Recommendation: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }

      if (mediumIssues.length > 0) {
        report += `### Medium Priority Issues (${mediumIssues.length})\n`;
        mediumIssues.forEach(issue => {
          report += `- **${issue.category}:** ${issue.description}\n`;
          report += `  - Recommendation: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }

      if (lowIssues.length > 0) {
        report += `### Low Priority Issues (${lowIssues.length})\n`;
        lowIssues.forEach(issue => {
          report += `- **${issue.category}:** ${issue.description}\n`;
          report += `  - Recommendation: ${issue.recommendation}\n`;
        });
        report += `\n`;
      }
    }

    if (audit.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      audit.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }

    return report;
  }
}

export default SecurityAuditService;
