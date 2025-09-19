/**
 * Automated Security Scanning Service
 * 
 * Provides automated security scanning and vulnerability detection
 * for the application.
 */

import { monitoringService } from './monitoring.service';
import { logger } from '../../utils/logger';

export interface SecurityVulnerability {
  id: string;
  type: 'sql_injection' | 'xss' | 'csrf' | 'insecure_direct_object_reference' | 'security_misconfiguration' | 'sensitive_data_exposure' | 'missing_function_level_access_control' | 'known_vulnerable_components' | 'unvalidated_redirects_forwards' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  detectedAt: Date;
  resolved?: Date;
  metadata?: Record<string, any>;
}

export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  status: 'completed' | 'failed' | 'in_progress';
}

export interface SecurityMetrics {
  totalScans: number;
  vulnerabilitiesFound: number;
  vulnerabilitiesResolved: number;
  averageScanTime: number;
  lastScanDate?: Date;
  riskScore: number; // 0-100, lower is better
}

export class SecurityScanService {
  private vulnerabilities: SecurityVulnerability[] = [];
  private scanHistory: SecurityScanResult[] = [];
  private maxHistorySize = 100;

  constructor() {
    // Start periodic security scans
    this.startPeriodicScans();
  }

  /**
   * Perform a comprehensive security scan
   */
  async performSecurityScan(): Promise<SecurityScanResult> {
    const scanId = `scan-${Date.now()}`;
    const startTime = Date.now();
    
    logger.info('🔍 Starting security scan: ${scanId}');

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

      this.scanHistory.push(result);
      
      // Trim history if needed
      if (this.scanHistory.length > this.maxHistorySize) {
        this.scanHistory = this.scanHistory.slice(-this.maxHistorySize);
      }

      // Record metrics
      monitoringService.recordMetrics([
        {
          name: 'security_scan_duration',
          value: scanTime,
          unit: 'ms',
          tags: { scan_id: scanId }
        },
        {
          name: 'security_vulnerabilities_found',
          value: vulnerabilities.length,
          tags: { scan_id: scanId }
        },
        {
          name: 'security_risk_score',
          value: this.calculateRiskScore(vulnerabilities),
          tags: { scan_id: scanId }
        }
      ]);

      logger.info('✅ Security scan completed: ${scanId} (${scanTime}ms, ${vulnerabilities.length} vulnerabilities)');
      
      return result;

    } catch (error) {
      logger.error('❌ Security scan failed: ${scanId}', error);
      
      const result: SecurityScanResult = {
        scanId,
        timestamp: new Date(),
        vulnerabilities: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
        status: 'failed'
      };

      this.scanHistory.push(result);
      return result;
    }
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  private async checkSqlInjectionVulnerabilities(): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for direct string concatenation in queries
    // This would typically involve static analysis of the codebase
    // For now, we'll simulate some checks

    // Check if express-mongo-sanitize is properly configured
    if (!process.env.MONGO_SANITIZE_ENABLED) {
      vulnerabilities.push({
        id: 'sql-injection-001',
        type: 'sql_injection',
        severity: 'high',
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
        severity: 'medium',
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
        severity: 'medium',
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
        severity: 'high',
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
        severity: 'medium',
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
        severity: 'critical',
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
          severity: 'high',
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
        severity: 'high',
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

    // This would typically involve checking package.json for known vulnerabilities
    // For now, we'll simulate some checks

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 18) {
      vulnerabilities.push({
        id: 'vuln-node-001',
        type: 'known_vulnerable_components',
        severity: 'medium',
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
        severity: 'medium',
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
   * Calculate risk score (0-100, lower is better)
   */
  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 0;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': score += 25; break;
        case 'high': score += 15; break;
        case 'medium': score += 8; break;
        case 'low': score += 3; break;
      }
    });

    return Math.min(score, 100);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const totalScans = this.scanHistory.length;
    const vulnerabilitiesFound = this.scanHistory.reduce((sum, scan) => sum + scan.vulnerabilities.length, 0);
    const vulnerabilitiesResolved = this.vulnerabilities.filter(v => v.resolved).length;
    const averageScanTime = totalScans > 0 ? 
      this.scanHistory.reduce((sum, scan) => sum + (scan.timestamp.getTime() - scan.timestamp.getTime()), 0) / totalScans : 0;
    
    const lastScan = this.scanHistory[this.scanHistory.length - 1];
    const riskScore = lastScan ? this.calculateRiskScore(lastScan.vulnerabilities) : 0;

    return {
      totalScans,
      vulnerabilitiesFound,
      vulnerabilitiesResolved,
      averageScanTime,
      lastScanDate: lastScan?.timestamp,
      riskScore
    };
  }

  /**
   * Get scan history
   */
  getScanHistory(limit?: number): SecurityScanResult[] {
    const history = [...this.scanHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Resolve a vulnerability
   */
  resolveVulnerability(vulnerabilityId: string): void {
    const vuln = this.vulnerabilities.find(v => v.id === vulnerabilityId);
    if (vuln) {
      vuln.resolved = new Date();
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
        logger.error('Periodic security scan failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run initial scan after 30 seconds
    setTimeout(async () => {
      try {
        await this.performSecurityScan();
      } catch (error) {
        logger.error('Initial security scan failed:', error);
      }
    }, 30000);
  }
}

// Global security scan service instance
export const securityScanService = new SecurityScanService();
