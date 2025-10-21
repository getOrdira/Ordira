import { Model, Document } from 'mongoose';
import { logger } from '../../../../utils/logger';
import {
  SecurityVulnerability,
  SecurityScanResult,
  SecurityScanMetrics,
  SecurityVulnerabilityCreateInput,
  SecurityScanResultCreateInput,
  SecuritySeverity
} from '../utils/securityTypes';

// Mock models for now - these would be actual Mongoose models in production
interface SecurityVulnerabilityModel extends Model<SecurityVulnerability & Document> {}
interface SecurityScanResultModel extends Model<SecurityScanResult & Document> {}

/**
 * Core data service for security scanning operations.
 * Handles persistence and retrieval of security vulnerabilities and scan results.
 */
export class SecurityScanDataService {
  private vulnerabilities: SecurityVulnerability[] = [];
  private scanResults: SecurityScanResult[] = [];
  private maxHistorySize = 100;

  constructor() {
    // In production, these would be actual Mongoose models
    // this.vulnerabilitiesModel = SecurityVulnerabilityModel;
    // this.scanResultsModel = SecurityScanResultModel;
  }

  /**
   * Create a new security vulnerability record
   */
  async createVulnerability(input: SecurityVulnerabilityCreateInput): Promise<SecurityVulnerability> {
    const vulnerability: SecurityVulnerability = {
      id: input.id || `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description,
      recommendation: input.recommendation,
      detectedAt: input.detectedAt || new Date(),
      resolved: input.resolved,
      metadata: input.metadata
    };

    this.vulnerabilities.push(vulnerability);
    
    logger.info('Security vulnerability created', {
      vulnerabilityId: vulnerability.id,
      type: vulnerability.type,
      severity: vulnerability.severity
    });

    return vulnerability;
  }

  /**
   * Create a new security scan result
   */
  async createScanResult(input: SecurityScanResultCreateInput): Promise<SecurityScanResult> {
    const scanResult: SecurityScanResult = {
      scanId: input.scanId || `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: input.timestamp || new Date(),
      vulnerabilities: input.vulnerabilities,
      summary: input.summary,
      status: input.status
    };

    this.scanResults.push(scanResult);
    
    // Trim history if needed
    if (this.scanResults.length > this.maxHistorySize) {
      this.scanResults = this.scanResults.slice(-this.maxHistorySize);
    }

    logger.info('Security scan result created', {
      scanId: scanResult.scanId,
      status: scanResult.status,
      vulnerabilityCount: scanResult.vulnerabilities.length
    });

    return scanResult;
  }

  /**
   * Get vulnerability by ID
   */
  async getVulnerabilityById(id: string): Promise<SecurityVulnerability | null> {
    return this.vulnerabilities.find(v => v.id === id) || null;
  }

  /**
   * Get scan result by ID
   */
  async getScanResultById(scanId: string): Promise<SecurityScanResult | null> {
    return this.scanResults.find(s => s.scanId === scanId) || null;
  }

  /**
   * Get all vulnerabilities with optional filtering
   */
  async getVulnerabilities(filters?: {
    type?: string;
    severity?: SecuritySeverity;
    resolved?: boolean;
    limit?: number;
  }): Promise<SecurityVulnerability[]> {
    let filtered = [...this.vulnerabilities];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(v => v.type === filters.type);
      }
      if (filters.severity) {
        filtered = filtered.filter(v => v.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        filtered = filtered.filter(v => !!v.resolved === filters.resolved);
      }
    }

    // Sort by detected date (newest first)
    filtered.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get scan history with optional limit
   */
  async getScanHistory(limit?: number): Promise<SecurityScanResult[]> {
    const history = [...this.scanResults].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Resolve a vulnerability
   */
  async resolveVulnerability(vulnerabilityId: string): Promise<boolean> {
    const vulnerability = this.vulnerabilities.find(v => v.id === vulnerabilityId);
    if (vulnerability && !vulnerability.resolved) {
      vulnerability.resolved = new Date();
      
      logger.info('Security vulnerability resolved', {
        vulnerabilityId,
        type: vulnerability.type,
        severity: vulnerability.severity
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get security scan metrics
   */
  async getSecurityScanMetrics(): Promise<SecurityScanMetrics> {
    const totalScans = this.scanResults.length;
    const vulnerabilitiesFound = this.scanResults.reduce((sum, scan) => sum + scan.vulnerabilities.length, 0);
    const vulnerabilitiesResolved = this.vulnerabilities.filter(v => v.resolved).length;
    
    // Calculate average scan time (simplified - in production this would be more sophisticated)
    const averageScanTime = totalScans > 0 ? 15000 : 0; // 15 seconds average
    
    const lastScan = this.scanResults[this.scanResults.length - 1];
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
   * Count vulnerabilities by severity
   */
  async countVulnerabilitiesBySeverity(): Promise<Record<SecuritySeverity, number>> {
    const counts: Record<SecuritySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.vulnerabilities.forEach(vuln => {
      if (!vuln.resolved) {
        counts[vuln.severity]++;
      }
    });

    return counts;
  }

  /**
   * Get vulnerabilities by type
   */
  async getVulnerabilitiesByType(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    this.vulnerabilities.forEach(vuln => {
      if (!vuln.resolved) {
        counts[vuln.type] = (counts[vuln.type] || 0) + 1;
      }
    });

    return counts;
  }

  /**
   * Delete old scan results (cleanup)
   */
  async deleteOldScanResults(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const initialCount = this.scanResults.length;
    
    this.scanResults = this.scanResults.filter(scan => scan.timestamp > cutoffDate);
    
    const deletedCount = initialCount - this.scanResults.length;
    
    if (deletedCount > 0) {
      logger.info('Deleted old scan results', {
        deletedCount,
        olderThanDays,
        remainingCount: this.scanResults.length
      });
    }

    return deletedCount;
  }

  /**
   * Calculate risk score based on vulnerabilities
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
}

export const securityScanDataService = new SecurityScanDataService();
