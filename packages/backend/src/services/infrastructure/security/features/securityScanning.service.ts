import { logger } from '../../../../utils/logger';
import { securityScanDataService, SecurityScanDataService } from '../core/securityScanData.service';
import { securityEventLoggerService, SecurityEventLoggerService } from './securityEventLogger.service';
import {
  SecurityVulnerability,
  SecurityScanResult,
  SecurityScanMetrics,
  SecurityVulnerabilityType,
  SecuritySeverity,
  SecurityActorType,
  SecurityEventType
} from '../utils/securityTypes';

/**
 * Feature service for automated security scanning and vulnerability detection.
 * Integrates with the existing security infrastructure for comprehensive monitoring.
 */
export class SecurityScanningService {
  private scanInProgress = false;
  private lastScanTime?: Date;

  constructor(
    private readonly dataService: SecurityScanDataService = securityScanDataService,
    private readonly eventLogger: SecurityEventLoggerService = securityEventLoggerService
  ) {
    // Start periodic security scans
    this.startPeriodicScans();
  }

  /**
   * Perform a comprehensive security scan
   */
  async performSecurityScan(): Promise<SecurityScanResult> {
    if (this.scanInProgress) {
      throw new Error('Security scan already in progress');
    }

    this.scanInProgress = true;
    const scanId = `scan-${Date.now()}`;
    const startTime = Date.now();
    
    logger.info('🔍 Starting security scan', { scanId });

    try {
      const vulnerabilities: SecurityVulnerability[] = [];

      // Run different types of security checks
      vulnerabilities.push(...await this.checkSqlInjectionVulnerabilities());
      vulnerabilities.push(...await this.checkXssVulnerabilities());
      vulnerabilities.push(...await this.checkCsrfVulnerabilities());
      vulnerabilities.push(...await this.checkInsecureDirectObjectReferences());
      vulnerabilities.push(...await this.checkSecurityMisconfigurations());
      vulnerabilities.push(...await this.checkSensitiveDataExposure());
      vulnerabilities.push(...await this.checkAccessControlIssues());
      vulnerabilities.push(...await this.checkVulnerableComponents());
      vulnerabilities.push(...await this.checkUnvalidatedRedirects());

      const scanTime = Date.now() - startTime;
      
      const result: SecurityScanResult = {
        scanId,
        timestamp: new Date(),
        vulnerabilities,
        summary: this.calculateVulnerabilitySummary(vulnerabilities),
        status: 'completed'
      };

      // Persist the scan result
      await this.dataService.createScanResult(result);
      
      // Persist individual vulnerabilities
      for (const vulnerability of vulnerabilities) {
        await this.dataService.createVulnerability(vulnerability);
      }

      // Log security events for critical vulnerabilities
      await this.logCriticalVulnerabilities(vulnerabilities);

      this.lastScanTime = new Date();

      logger.info('✅ Security scan completed', {
        scanId,
        scanTime,
        vulnerabilityCount: vulnerabilities.length,
        riskScore: result.summary.critical * 25 + result.summary.high * 15 + result.summary.medium * 8 + result.summary.low * 3
      });
      
      return result;

    } catch (error) {
      logger.error('❌ Security scan failed', { scanId, error });
      
      const result: SecurityScanResult = {
        scanId,
        timestamp: new Date(),
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        status: 'failed'
      };

      await this.dataService.createScanResult(result);
      return result;
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Get security scan metrics
   */
  async getSecurityScanMetrics(): Promise<SecurityScanMetrics> {
    return await this.dataService.getSecurityScanMetrics();
  }

  /**
   * Get scan history
   */
  async getScanHistory(limit?: number): Promise<SecurityScanResult[]> {
    return await this.dataService.getScanHistory(limit);
  }

  /**
   * Get unresolved vulnerabilities
   */
  async getUnresolvedVulnerabilities(): Promise<SecurityVulnerability[]> {
    return await this.dataService.getVulnerabilities({ resolved: false });
  }

  /**
   * Resolve a vulnerability
   */
  async resolveVulnerability(vulnerabilityId: string): Promise<boolean> {
    const resolved = await this.dataService.resolveVulnerability(vulnerabilityId);
    
    if (resolved) {
      // Log resolution event
      await this.eventLogger.logEvent({
        eventType: SecurityEventType.SECURITY_SETTINGS_CHANGED,
        userId: 'system',
        userType: 'business',
        severity: SecuritySeverity.LOW,
        success: true,
        additionalData: {
          action: 'vulnerability_resolved',
          vulnerabilityId,
          timestamp: new Date()
        },
        timestamp: new Date()
      });
    }

    return resolved;
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  private async checkSqlInjectionVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check if express-mongo-sanitize is properly configured
    if (!process.env.MONGO_SANITIZE_ENABLED) {
      vulnerabilities.push({
        id: 'sql-injection-001',
        type: 'sql_injection',
        severity: SecuritySeverity.HIGH,
        title: 'MongoDB Sanitization Not Enabled',
        description: 'MongoDB sanitization middleware is not properly configured',
        recommendation: 'Enable express-mongo-sanitize middleware in your Express app',
        detectedAt: new Date(),
        metadata: { check: 'mongo_sanitize_config' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for XSS vulnerabilities
   */
  private async checkXssVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check CSP configuration
    if (!process.env.CSP_ENABLED) {
      vulnerabilities.push({
        id: 'xss-001',
        type: 'xss',
        severity: SecuritySeverity.MEDIUM,
        title: 'Content Security Policy Not Configured',
        description: 'Content Security Policy headers are not properly configured',
        recommendation: 'Implement CSP headers using Helmet.js or similar middleware',
        detectedAt: new Date(),
        metadata: { check: 'csp_config' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for CSRF vulnerabilities
   */
  private async checkCsrfVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check CSRF protection
    if (!process.env.CSRF_PROTECTION_ENABLED) {
      vulnerabilities.push({
        id: 'csrf-001',
        type: 'csrf',
        severity: SecuritySeverity.MEDIUM,
        title: 'CSRF Protection Not Enabled',
        description: 'CSRF protection is not properly configured',
        recommendation: 'Implement CSRF tokens or SameSite cookie attributes',
        detectedAt: new Date(),
        metadata: { check: 'csrf_config' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for insecure direct object references
   */
  private async checkInsecureDirectObjectReferences(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check if business ID validation is properly implemented
    if (!process.env.BUSINESS_ID_VALIDATION_ENABLED) {
      vulnerabilities.push({
        id: 'idor-001',
        type: 'insecure_direct_object_reference',
        severity: SecuritySeverity.HIGH,
        title: 'Business ID Validation Missing',
        description: 'Direct object references may not be properly validated',
        recommendation: 'Implement proper business ID validation in all routes',
        detectedAt: new Date(),
        metadata: { check: 'business_id_validation' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for security misconfigurations
   */
  private async checkSecurityMisconfigurations(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for debug mode in production
    if (process.env.NODE_ENV === 'production' && process.env.DEBUG) {
      vulnerabilities.push({
        id: 'misconfig-001',
        type: 'security_misconfiguration',
        severity: SecuritySeverity.MEDIUM,
        title: 'Debug Mode Enabled in Production',
        description: 'Debug mode is enabled in production environment',
        recommendation: 'Disable debug mode in production',
        detectedAt: new Date(),
        metadata: { check: 'debug_mode' }
      });
    }

    // Check for default passwords
    if (process.env.DEFAULT_PASSWORD_USED === 'true') {
      vulnerabilities.push({
        id: 'misconfig-002',
        type: 'security_misconfiguration',
        severity: SecuritySeverity.CRITICAL,
        title: 'Default Password Detected',
        description: 'Default passwords are being used',
        recommendation: 'Change all default passwords immediately',
        detectedAt: new Date(),
        metadata: { check: 'default_passwords' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for sensitive data exposure
   */
  private async checkSensitiveDataExposure(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for exposed secrets in environment variables
    const sensitiveVars = ['JWT_SECRET', 'DB_PASSWORD', 'AWS_SECRET_ACCESS_KEY'];
    for (const varName of sensitiveVars) {
      if (process.env[varName] && process.env[varName].length < 32) {
        vulnerabilities.push({
          id: `exposure-${varName.toLowerCase()}`,
          type: 'sensitive_data_exposure',
          severity: SecuritySeverity.HIGH,
          title: `Weak ${varName}`,
          description: `${varName} is too short or weak`,
          recommendation: `Use a strong ${varName} with at least 32 characters`,
          detectedAt: new Date(),
          metadata: { check: 'weak_secret', variable: varName }
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for access control issues
   */
  private async checkAccessControlIssues(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check if authentication middleware is properly configured
    if (!process.env.AUTH_MIDDLEWARE_ENABLED) {
      vulnerabilities.push({
        id: 'access-001',
        type: 'missing_function_level_access_control',
        severity: SecuritySeverity.HIGH,
        title: 'Authentication Middleware Not Configured',
        description: 'Authentication middleware may not be properly configured',
        recommendation: 'Ensure authentication middleware is applied to protected routes',
        detectedAt: new Date(),
        metadata: { check: 'auth_middleware' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for vulnerable components
   */
  private async checkVulnerableComponents(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 18) {
      vulnerabilities.push({
        id: 'vuln-node-001',
        type: 'known_vulnerable_components',
        severity: SecuritySeverity.MEDIUM,
        title: 'Outdated Node.js Version',
        description: `Node.js version ${nodeVersion} may have security vulnerabilities`,
        recommendation: 'Upgrade to Node.js 18 or later',
        detectedAt: new Date(),
        metadata: { check: 'node_version', version: nodeVersion }
      });
    }

    return vulnerabilities;
  }

  /**
   * Check for unvalidated redirects
   */
  private async checkUnvalidatedRedirects(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check if redirect validation is implemented
    if (!process.env.REDIRECT_VALIDATION_ENABLED) {
      vulnerabilities.push({
        id: 'redirect-001',
        type: 'unvalidated_redirects_forwards',
        severity: SecuritySeverity.MEDIUM,
        title: 'Redirect Validation Missing',
        description: 'Redirect URLs may not be properly validated',
        recommendation: 'Implement proper redirect URL validation',
        detectedAt: new Date(),
        metadata: { check: 'redirect_validation' }
      });
    }

    return vulnerabilities;
  }

  /**
   * Calculate vulnerability summary
   */
  private calculateVulnerabilitySummary(vulnerabilities: SecurityVulnerability[]): SecurityScanResult['summary'] {
    const summary = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    
    vulnerabilities.forEach(vuln => {
      summary.total++;
      summary[vuln.severity]++;
    });

    return summary;
  }

  /**
   * Log critical vulnerabilities as security events
   */
  private async logCriticalVulnerabilities(vulnerabilities: SecurityVulnerability[]): Promise<void> {
    const criticalVulns = vulnerabilities.filter(v => v.severity === SecuritySeverity.CRITICAL || v.severity === SecuritySeverity.HIGH);
    
    for (const vuln of criticalVulns) {
      try {
        await this.eventLogger.logEvent({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          userId: 'system',
          userType: 'business',
          severity: vuln.severity === SecuritySeverity.CRITICAL ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
          success: false,
          additionalData: {
            vulnerabilityType: vuln.type,
            vulnerabilityId: vuln.id,
            title: vuln.title,
            description: vuln.description
          },
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Failed to log critical vulnerability event', { vulnId: vuln.id, error });
      }
    }
  }

  /**
   * Start periodic security scans
   */
  private startPeriodicScans(): void {
    // Run security scan every hour
    setInterval(async () => {
      try {
        await this.performSecurityScan();
      } catch (error) {
        logger.error('Periodic security scan failed', { error });
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run initial scan after 30 seconds
    setTimeout(async () => {
      try {
        await this.performSecurityScan();
      } catch (error) {
        logger.error('Initial security scan failed', { error });
      }
    }, 30000);
  }

  /**
   * Check if a scan is currently in progress
   */
  isScanInProgress(): boolean {
    return this.scanInProgress;
  }

  /**
   * Get the last scan time
   */
  getLastScanTime(): Date | undefined {
    return this.lastScanTime;
  }
}

export const securityScanningService = new SecurityScanningService();
