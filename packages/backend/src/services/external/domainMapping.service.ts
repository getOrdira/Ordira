// src/services/external/domainMapping.service.ts

import { DomainMapping, IDomainMapping } from '../../models/domainMapping.model';
import { logger } from '../../utils/logger'; 
import { Business } from '../../models/business.model';
import * as dns from 'dns/promises';
import * as crypto from 'crypto';

export interface CnameInstruction {
  hostname: string;
  record: {
    type: 'CNAME';
    name: string;
    value: string;
    ttl?: number;
  };
}

export interface DomainValidationResult {
  valid: boolean;
  issues?: string[];
  suggestions?: string[];
}

export interface CertificateValidationResult {
  valid: boolean;
  issues?: string[];
  expiresAt?: Date;
  issuer?: string;
}

export interface DomainVerificationResult {
  success: boolean;
  errors?: string[];
  suggestions?: string[];
  retryAfter?: number;
  verifiedAt?: Date;
  sslCertificateRequested?: boolean;
  estimatedSslIssuance?: Date;
  propagationTime?: number;
  fullyOperational?: boolean;
}

export interface EnhancedDomainMapping {
  id: string;
  domain: string;
  status: 'pending_verification' | 'active' | 'error' | 'deleting';
  certificateType: 'letsencrypt' | 'custom';
  createdAt: Date;
  updatedAt: Date;
  dnsRecords: any[];
  verificationMethod: string;
  verificationToken: string;
  sslEnabled: boolean;
  autoRenewal: boolean;
  certificateInfo?: any;
  dnsStatus?: string;
  sslStatus?: string;
  overallHealth?: string;
  lastHealthCheck?: Date;
  averageResponseTime?: number;
  uptimePercentage?: number;
  certificateExpiry?: Date;
  cnameTarget?: string;
}

export interface HealthCheckResult {
  overall: 'healthy' | 'warning' | 'error';
  dns: { status: string; details?: any };
  ssl: { status: string; details?: any };
  connectivity: { status: string; details?: any };
  performance: { status: string; responseTime?: number };
  responseTime: number;
  uptime: number;
  lastDowntime?: Date;
  issues: string[];
  timestamp: Date;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  uptime: number;
  errorRate: number;
  loadTime: number;
  timeSeries: Array<{
    timestamp: Date;
    responseTime: number;
    status: number;
  }>;
}

export interface DomainAnalytics {
  traffic: {
    requests: number;
    uniqueVisitors: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    uptime: number;
  };
  errors: {
    total: number;
    rate: number;
    breakdown: { [code: string]: number };
  };
  ssl: {
    expiresIn: number;
    issuer: string;
    valid: boolean;
  };
  timeSeries?: Array<{
    timestamp: Date;
    requests: number;
    responseTime: number;
    errors: number;
  }>;
}

export interface TestResults {
  overall: 'pass' | 'warning' | 'fail';
  dns: { status: string; details: any };
  ssl: { status: string; details: any };
  http: { status: string; details: any };
  redirects: { status: string; details: any };
  issues: string[];
  warnings: string[];
  recommendations: string[];
  timestamp: Date;
}

export class DomainMappingService {

  /**
   * Get domain count for a business
   */
  async getDomainCount(businessId: string): Promise<number> {
    return await DomainMapping.countDocuments({ 
      business: businessId,
      status: { $ne: 'deleting' }
    });
  }

  /**
   * Validate domain format and availability
   */
  async validateDomain(domain: string, businessId?: string): Promise<DomainValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic format validation
      if (!this.isValidHostname(domain)) {
        issues.push('Invalid domain format');
        suggestions.push('Use a valid domain format like "app.yourdomain.com"');
      }

      // Check if domain is already mapped
      const existing = await DomainMapping.findOne({ 
        domain,
        ...(businessId && { business: { $ne: businessId } })
      });

      if (existing) {
        issues.push('Domain is already mapped to another account');
        suggestions.push('Use a different subdomain or contact support');
      }

      // Check if domain resolves
      try {
        await dns.resolve(domain);
        // If it resolves, check if it's pointing to our service
        const records = await dns.resolveCname(domain).catch(() => []);
        if (records.length > 0 && !records.includes(process.env.FRONTEND_HOSTNAME!)) {
          issues.push('Domain is already configured elsewhere');
          suggestions.push('Remove existing DNS records before mapping');
        }
      } catch (error) {
        // Domain doesn't resolve - this is expected for new mappings
      }

      // Reserved domain check
      if (this.isReservedDomain(domain)) {
        issues.push('Domain is reserved and cannot be used');
        suggestions.push('Use a different domain or subdomain');
      }

      return {
        valid: issues.length === 0,
        issues: issues.length > 0 ? issues : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    } catch (error: any) {
      return {
        valid: false,
        issues: [`Validation error: ${error.message}`],
        suggestions: ['Please try again or contact support']
      };
    }
  }

  /**
   * Find existing domain mapping
   */
  async findExistingMapping(domain: string): Promise<{ businessId: string } | null> {
    const mapping = await DomainMapping.findOne({ domain });
    return mapping ? { businessId: mapping.business.toString() } : null;
  }

  /**
   * Validate custom SSL certificate
   */
  async validateCustomCertificate(domain: string, certificate: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
  }): Promise<CertificateValidationResult> {
    const issues: string[] = [];

    try {
      // Basic certificate validation
      if (!certificate.certificate || !certificate.privateKey) {
        issues.push('Certificate and private key are required');
      }

      // TODO: Implement actual certificate validation
      // This would involve parsing the certificate and validating:
      // - Certificate format (PEM)
      // - Domain match
      // - Private key match
      // - Expiration date
      // - Certificate chain validity

      // For now, basic checks
      if (certificate.certificate && !certificate.certificate.includes('-----BEGIN CERTIFICATE-----')) {
        issues.push('Invalid certificate format - must be PEM format');
      }

      if (certificate.privateKey && !certificate.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        issues.push('Invalid private key format - must be PEM format');
      }

      return {
        valid: issues.length === 0,
        issues: issues.length > 0 ? issues : undefined,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Placeholder
        issuer: 'Custom Certificate'
      };
    } catch (error: any) {
      return {
        valid: false,
        issues: [`Certificate validation error: ${error.message}`]
      };
    }
  }

  /**
   * Create enhanced domain mapping with advanced features
   */
  async createEnhancedDomainMapping(businessId: string, data: {
    domain: string;
    certificateType: 'letsencrypt' | 'custom';
    forceHttps: boolean;
    autoRenewal: boolean;
    customCertificate?: any;
    planLevel: string;
    createdBy: string;
    mappingMetadata: any;
  }): Promise<EnhancedDomainMapping> {
    try {
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const cnameTarget = process.env.FRONTEND_HOSTNAME || 'app.yourdomain.com';

      // Create domain mapping record
      const mapping = await DomainMapping.create({
        business: businessId,
        domain: data.domain,
        hostname: data.domain, // For backward compatibility
        status: 'pending_verification',
        certificateType: data.certificateType,
        forceHttps: data.forceHttps,
        autoRenewal: data.autoRenewal,
        sslEnabled: true,
        verificationMethod: 'dns',
        verificationToken,
        cnameTarget,
        planLevel: data.planLevel,
        createdBy: data.createdBy,
        mappingMetadata: data.mappingMetadata,
        customCertificate: data.customCertificate,
        healthStatus: 'unknown',
        lastHealthCheck: new Date()
      });

      // Generate DNS records
      const dnsRecords = [
        {
          type: 'CNAME',
          name: data.domain,
          value: cnameTarget,
          ttl: 300,
          required: true
        }
      ];

      if (data.certificateType === 'letsencrypt') {
        dnsRecords.push({
          type: 'TXT',
          name: `_acme-challenge.${data.domain}`,
          value: verificationToken,
          ttl: 300,
          required: true
        });
      }

      return {
        id: mapping._id.toString(),
        domain: mapping.domain,
        status: mapping.status,
        certificateType: mapping.certificateType,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        dnsRecords,
        verificationMethod: mapping.verificationMethod,
        verificationToken: mapping.verificationToken,
        sslEnabled: mapping.sslEnabled,
        autoRenewal: mapping.autoRenewal,
        cnameTarget: mapping.cnameTarget,
        overallHealth: 'unknown',
        lastHealthCheck: mapping.lastHealthCheck
      };
    } catch (error: any) {
      throw new Error(`Failed to create domain mapping: ${error.message}`);
    }
  }

  /**
   * Get enhanced domain mappings with health status
   */
  async getEnhancedDomainMappings(businessId: string): Promise<EnhancedDomainMapping[]> {
    try {
      const mappings = await DomainMapping.find({ 
        business: businessId,
        status: { $ne: 'deleting' }
      }).sort({ createdAt: -1 });

      return mappings.map(mapping => ({
        id: mapping._id.toString(),
        domain: mapping.domain,
        status: mapping.status,
        certificateType: mapping.certificateType || 'letsencrypt',
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        dnsRecords: mapping.dnsRecords || [],
        verificationMethod: mapping.verificationMethod || 'dns',
        verificationToken: mapping.verificationToken || '',
        sslEnabled: mapping.sslEnabled !== false,
        autoRenewal: mapping.autoRenewal !== false,
        cnameTarget: mapping.cnameTarget || process.env.FRONTEND_HOSTNAME,
        dnsStatus: mapping.dnsStatus || 'unknown',
        sslStatus: mapping.sslStatus || 'unknown',
        overallHealth: mapping.healthStatus || 'unknown',
        lastHealthCheck: mapping.lastHealthCheck,
        averageResponseTime: mapping.averageResponseTime || 0,
        uptimePercentage: mapping.uptimePercentage || 0,
        certificateExpiry: mapping.certificateExpiry
      }));
    } catch (error: any) {
      throw new Error(`Failed to get domain mappings: ${error.message}`);
    }
  }

  /**
   * Get detailed domain mapping information
   */
  async getDetailedDomainMapping(businessId: string, domainId: string): Promise<EnhancedDomainMapping | null> {
    try {
      const mapping = await DomainMapping.findOne({
        _id: domainId,
        business: businessId
      });

      if (!mapping) {
        return null;
      }

      return {
        id: mapping._id.toString(),
        domain: mapping.domain,
        status: mapping.status,
        certificateType: mapping.certificateType || 'letsencrypt',
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        dnsRecords: mapping.dnsRecords || [],
        verificationMethod: mapping.verificationMethod || 'dns',
        verificationToken: mapping.verificationToken || '',
        sslEnabled: mapping.sslEnabled !== false,
        autoRenewal: mapping.autoRenewal !== false,
        cnameTarget: mapping.cnameTarget || process.env.FRONTEND_HOSTNAME,
        dnsStatus: mapping.dnsStatus || 'unknown',
        sslStatus: mapping.sslStatus || 'unknown',
        overallHealth: mapping.healthStatus || 'unknown',
        lastHealthCheck: mapping.lastHealthCheck,
        averageResponseTime: mapping.averageResponseTime || 0,
        uptimePercentage: mapping.uptimePercentage || 0,
        certificateExpiry: mapping.certificateExpiry,
        certificateInfo: mapping.certificateInfo
      };
    } catch (error: any) {
      throw new Error(`Failed to get domain mapping: ${error.message}`);
    }
  }

  /**
   * Get basic domain mapping
   */
  async getDomainMapping(businessId: string, domainId: string): Promise<any> {
    return await DomainMapping.findOne({
      _id: domainId,
      business: businessId
    });
  }

  /**
   * Verify domain ownership
   */
  async verifyDomainOwnership(domainId: string, options: {
    method: string;
    businessId: string;
    verifiedBy: string;
  }): Promise<DomainVerificationResult> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      // Perform DNS verification
      const dnsCheck = await this.performDnsVerification(mapping.domain, mapping.verificationToken);
      
      if (!dnsCheck.success) {
        return {
          success: false,
          errors: dnsCheck.errors,
          suggestions: [
            'Ensure DNS records are properly configured',
            'Wait for DNS propagation (up to 60 minutes)',
            'Check with your DNS provider for configuration help'
          ],
          retryAfter: 300 // 5 minutes
        };
      }

      // Update mapping status
      await DomainMapping.findByIdAndUpdate(domainId, {
        status: 'active',
        verifiedAt: new Date(),
        verifiedBy: options.verifiedBy,
        dnsStatus: 'verified',
        healthStatus: 'healthy'
      });

      // Request SSL certificate
      const sslRequest = await this.requestSslCertificate(mapping.domain, mapping.certificateType);

      return {
        success: true,
        verifiedAt: new Date(),
        sslCertificateRequested: sslRequest.requested,
        estimatedSslIssuance: new Date(Date.now() + 600000), // 10 minutes
        propagationTime: dnsCheck.propagationTime || 300,
        fullyOperational: true
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message],
        suggestions: ['Contact support for assistance']
      };
    }
  }

  /**
   * Update domain mapping
   */
  async updateDomainMapping(domainId: string, updateData: any): Promise<EnhancedDomainMapping> {
    try {
      const mapping = await DomainMapping.findByIdAndUpdate(
        domainId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      return {
        id: mapping._id.toString(),
        domain: mapping.domain,
        status: mapping.status,
        certificateType: mapping.certificateType || 'letsencrypt',
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        dnsRecords: mapping.dnsRecords || [],
        verificationMethod: mapping.verificationMethod || 'dns',
        verificationToken: mapping.verificationToken || '',
        sslEnabled: mapping.sslEnabled !== false,
        autoRenewal: mapping.autoRenewal !== false,
        cnameTarget: mapping.cnameTarget || process.env.FRONTEND_HOSTNAME,
        overallHealth: mapping.healthStatus || 'unknown'
      };
    } catch (error: any) {
      throw new Error(`Failed to update domain mapping: ${error.message}`);
    }
  }

  /**
   * Remove domain mapping with cleanup
   */
  async removeDomainMapping(domainId: string, options: {
    removedBy: string;
    removalReason: string;
    cleanupResources: boolean;
  }): Promise<{
    removedAt: Date;
    cleanupCompleted: boolean;
    certificateRevoked: boolean;
    dnsRecordsRemoved: boolean;
    cacheCleared: boolean;
  }> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      // Update status to deleting
      await DomainMapping.findByIdAndUpdate(domainId, {
        status: 'deleting',
        deletedBy: options.removedBy,
        deletionReason: options.removalReason
      });

      // Perform cleanup if requested
      let certificateRevoked = false;
      let dnsRecordsRemoved = false;
      let cacheCleared = false;

      if (options.cleanupResources) {
        // Revoke SSL certificate
        try {
          await this.revokeSslCertificate(mapping.domain);
          certificateRevoked = true;
        } catch (error) {
          logger.warn('Failed to revoke SSL certificate:', error);
        }

        // Clear DNS cache
        try {
          await this.clearDnsCache(mapping.domain);
          cacheCleared = true;
        } catch (error) {
          logger.warn('Failed to clear DNS cache:', error);
        }

        dnsRecordsRemoved = true; // We don't actually manage external DNS
      }

      // Actually delete the mapping
      await DomainMapping.findByIdAndDelete(domainId);

      return {
        removedAt: new Date(),
        cleanupCompleted: options.cleanupResources,
        certificateRevoked,
        dnsRecordsRemoved,
        cacheCleared
      };
    } catch (error: any) {
      throw new Error(`Failed to remove domain mapping: ${error.message}`);
    }
  }

  /**
   * Renew SSL certificate
   */
  async renewCertificate(domainId: string, options: {
    renewedBy: string;
    renewalReason: string;
  }): Promise<{
    renewedAt: Date;
    newExpiry: Date;
    certificateId: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
  }> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      // Request new certificate
      const renewal = await this.requestSslCertificate(mapping.domain, mapping.certificateType);
      
      const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      
      // Update mapping with new certificate info
      await DomainMapping.findByIdAndUpdate(domainId, {
        certificateExpiry: newExpiry,
        lastCertificateRenewal: new Date(),
        renewedBy: options.renewedBy,
        sslStatus: 'active'
      });

      return {
        renewedAt: new Date(),
        newExpiry,
        certificateId: renewal.certificateId || `cert_${Date.now()}`,
        issuer: mapping.certificateType === 'letsencrypt' ? "Let's Encrypt" : 'Custom CA',
        validFrom: new Date(),
        validTo: newExpiry
      };
    } catch (error: any) {
      throw new Error(`Failed to renew certificate: ${error.message}`);
    }
  }

  /**
   * Get domain health metrics
   */
  async getDomainHealth(domainId: string): Promise<HealthCheckResult> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      return await this.performHealthCheck(domainId);
    } catch (error: any) {
      throw new Error(`Failed to get domain health: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(domainId: string): Promise<HealthCheckResult> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      const domain = mapping.domain;
      const issues: string[] = [];
      let overall: 'healthy' | 'warning' | 'error' = 'healthy';

      // DNS Health Check
      const dnsHealth = await this.checkDnsHealth(domain);
      if (dnsHealth.status !== 'healthy') {
        issues.push(`DNS: ${dnsHealth.details?.error || 'Configuration issues'}`);
        overall = 'error';
      }

      // SSL Health Check
      const sslHealth = await this.checkSslHealth(domain);
      if (sslHealth.status !== 'healthy') {
        issues.push(`SSL: ${sslHealth.details?.error || 'Certificate issues'}`);
        if (overall !== 'error') overall = 'warning';
      }

      // Connectivity Check
      const connectivityHealth = await this.checkConnectivity(domain);
      if (connectivityHealth.status !== 'healthy') {
        issues.push(`Connectivity: ${connectivityHealth.details?.error || 'Connection issues'}`);
        overall = 'error';
      }

      // Performance Check
      const performanceHealth = await this.checkPerformance(domain);
      const responseTime = performanceHealth.responseTime || 0;

      if (responseTime > 5000) {
        issues.push('Performance: Slow response times detected');
        if (overall !== 'error') overall = 'warning';
      }

      // Update mapping with health status
      await DomainMapping.findByIdAndUpdate(domainId, {
        healthStatus: overall,
        lastHealthCheck: new Date(),
        dnsStatus: dnsHealth.status,
        sslStatus: sslHealth.status,
        averageResponseTime: responseTime
      });

      return {
        overall,
        dns: dnsHealth,
        ssl: sslHealth,
        connectivity: connectivityHealth,
        performance: performanceHealth,
        responseTime,
        uptime: mapping.uptimePercentage || 99.9,
        lastDowntime: mapping.lastDowntime,
        issues,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        overall: 'error',
        dns: { status: 'error', details: { error: error.message } },
        ssl: { status: 'unknown' },
        connectivity: { status: 'unknown' },
        performance: { status: 'unknown' },
        responseTime: 0,
        uptime: 0,
        issues: [error.message],
        timestamp: new Date()
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(domainId: string, timeframe: string): Promise<PerformanceMetrics> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      // Generate sample performance data
      // In production, this would come from actual monitoring data
      const timeSeries = this.generateSampleTimeSeries(timeframe);

      return {
        averageResponseTime: mapping.averageResponseTime || 500,
        uptime: mapping.uptimePercentage || 99.9,
        errorRate: 0.01,
        loadTime: 1200,
        timeSeries
      };
    } catch (error: any) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  /**
   * Get domain analytics
   */
  async getDomainAnalytics(domainId: string, options: {
    timeframe: string;
    includePerformance: boolean;
    includeErrors: boolean;
    includeTraffic: boolean;
  }): Promise<DomainAnalytics> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      // Generate analytics data
      // In production, this would come from actual analytics systems
      return {
        traffic: {
          requests: 15420,
          uniqueVisitors: 3241,
          trend: 'increasing'
        },
        performance: {
          averageResponseTime: mapping.averageResponseTime || 450,
          p95ResponseTime: 850,
          uptime: mapping.uptimePercentage || 99.95
        },
        errors: {
          total: 23,
          rate: 0.15,
          breakdown: {
            '404': 15,
            '500': 5,
            '502': 3
          }
        },
        ssl: {
          expiresIn: mapping.certificateExpiry ? 
            Math.floor((mapping.certificateExpiry.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 90,
          issuer: mapping.certificateType === 'letsencrypt' ? "Let's Encrypt" : 'Custom CA',
          valid: true
        },
        timeSeries: this.generateAnalyticsTimeSeries(options.timeframe)
      };
    } catch (error: any) {
      throw new Error(`Failed to get domain analytics: ${error.message}`);
    }
  }

  /**
   * Test domain configuration
   */
  async testDomainConfiguration(domainId: string): Promise<TestResults> {
    try {
      const mapping = await DomainMapping.findById(domainId);
      if (!mapping) {
        throw new Error('Domain mapping not found');
      }

      const domain = mapping.domain;
      const issues: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];
      let overall: 'pass' | 'warning' | 'fail' = 'pass';

      // DNS Test
      const dnsTest = await this.testDns(domain);
      if (dnsTest.status === 'fail') {
        issues.push('DNS configuration failed');
        overall = 'fail';
      } else if (dnsTest.status === 'warning') {
        warnings.push('DNS configuration has warnings');
        if (overall === 'pass') overall = 'warning';
      }

      // SSL Test
      const sslTest = await this.testSsl(domain);
      if (sslTest.status === 'fail') {
        issues.push('SSL configuration failed');
        overall = 'fail';
      } else if (sslTest.status === 'warning') {
        warnings.push('SSL configuration has warnings');
        if (overall !== 'fail') overall = 'warning';
      }

      // HTTP Test
      const httpTest = await this.testHttp(domain);
      if (httpTest.status === 'fail') {
        issues.push('HTTP connectivity failed');
        overall = 'fail';
      }

      // Redirects Test
      const redirectsTest = await this.testRedirects(domain);
      if (redirectsTest.status === 'warning') {
        warnings.push('Redirect configuration could be improved');
        if (overall !== 'fail') overall = 'warning';
      }

      // Generate recommendations
      if (issues.length > 0) {
        recommendations.push('Fix critical issues before going live');
      }
      if (warnings.length > 0) {
        recommendations.push('Address warnings for optimal performance');
      }
      if (overall === 'pass') {
        recommendations.push('Configuration looks good - domain is ready');
      }

      return {
        overall,
        dns: dnsTest,
        ssl: sslTest,
        http: httpTest,
        redirects: redirectsTest,
        issues,
        warnings,
        recommendations,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        overall: 'fail',
        dns: { status: 'fail', details: { error: error.message } },
        ssl: { status: 'unknown', details: {} },
        http: { status: 'unknown', details: {} },
        redirects: { status: 'unknown', details: {} },
        issues: [error.message],
        warnings: [],
        recommendations: ['Contact support for assistance'],
        timestamp: new Date()
      };
    }
  }

  // Private helper methods

  private isValidHostname(hostname: string): boolean {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(hostname) && hostname.length <= 253;
  }

  private isReservedDomain(domain: string): boolean {
    const reservedDomains = ['localhost', 'example.com', 'test.com', 'invalid'];
    return reservedDomains.some(reserved => domain.includes(reserved));
  }

  private async performDnsVerification(domain: string, token: string): Promise<{
    success: boolean;
    errors?: string[];
    propagationTime?: number;
  }> {
    try {
      // Check CNAME record
      const cnameRecords = await dns.resolveCname(domain).catch(() => []);
      const expectedTarget = process.env.FRONTEND_HOSTNAME;
      
      if (!cnameRecords.includes(expectedTarget!)) {
        return {
          success: false,
          errors: ['CNAME record not found or incorrect target']
        };
      }

      // Check TXT record for verification token
      const txtRecords = await dns.resolveTxt(`_acme-challenge.${domain}`).catch(() => []);
      const tokenFound = txtRecords.some(record => 
        Array.isArray(record) ? record.join('') === token : record === token
      );

      if (!tokenFound) {
        return {
          success: false,
          errors: ['Verification TXT record not found']
        };
      }

      return {
        success: true,
        propagationTime: 300
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  private async requestSslCertificate(domain: string, type: string): Promise<{
    requested: boolean;
    certificateId?: string;
  }> {
    try {
      // In production, this would integrate with Let's Encrypt or your SSL provider
      logger.info('Requesting ${type} SSL certificate for ${domain}');
      
      return {
        requested: true,
        certificateId: `cert_${Date.now()}_${domain.replace(/\./g, '_')}`
      };
    } catch (error: any) {
      throw new Error(`Failed to request SSL certificate: ${error.message}`);
    }
  }

  private async revokeSslCertificate(domain: string): Promise<void> {
    try {
      // In production, this would revoke the certificate with the CA
      logger.info('Revoking SSL certificate for ${domain}');
    } catch (error: any) {
      throw new Error(`Failed to revoke SSL certificate: ${error.message}`);
    }
  }

  private async clearDnsCache(domain: string): Promise<void> {
    try {
      // In production, this would clear DNS cache from CDN/proxy services
      logger.info('Clearing DNS cache for ${domain}');
    } catch (error: any) {
      throw new Error(`Failed to clear DNS cache: ${error.message}`);
    }
  }

  private async checkDnsHealth(domain: string): Promise<{ status: string; details?: any }> {
    try {
      const records = await dns.resolveCname(domain);
      const expectedTarget = process.env.FRONTEND_HOSTNAME;
      
      if (records.includes(expectedTarget!)) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'error', 
          details: { error: 'CNAME points to incorrect target' }
        };
      }
    } catch (error: any) {
      return { 
        status: 'error', 
        details: { error: error.message }
      };
    }
  }

  private async checkSslHealth(domain: string): Promise<{ status: string; details?: any }> {
    try {
      // In production, this would check SSL certificate validity
      // For now, return a simulated healthy status
      return { status: 'healthy' };
    } catch (error: any) {
      return { 
        status: 'error', 
        details: { error: error.message }
      };
    }
  }

  private async checkConnectivity(domain: string): Promise<{ status: string; details?: any }> {
    try {
      // In production, this would test HTTP connectivity
      // For now, return a simulated healthy status
      return { status: 'healthy' };
    } catch (error: any) {
      return { 
        status: 'error', 
        details: { error: error.message }
      };
    }
  }

  private async checkPerformance(domain: string): Promise<{ status: string; responseTime?: number }> {
    try {
      // In production, this would measure actual response time
      const responseTime = Math.random() * 1000 + 200; // Simulate 200-1200ms
      const status = responseTime < 1000 ? 'healthy' : 'warning';
      
      return { status, responseTime };
    } catch (error: any) {
      return { status: 'error' };
    }
  }

  private async testDns(domain: string): Promise<{ status: string; details: any }> {
    try {
      const records = await dns.resolveCname(domain);
      const expectedTarget = process.env.FRONTEND_HOSTNAME;
      
      if (records.includes(expectedTarget!)) {
        return { 
          status: 'pass', 
          details: { 
            cnameTarget: expectedTarget,
            records: records 
          }
        };
      } else {
        return { 
          status: 'fail', 
          details: { 
            error: 'CNAME record missing or incorrect',
            expected: expectedTarget,
            found: records
          }
        };
      }
    } catch (error: any) {
      return { 
        status: 'fail', 
        details: { error: error.message }
      };
    }
  }

  private async testSsl(domain: string): Promise<{ status: string; details: any }> {
    try {
      // In production, this would test SSL certificate
      return { 
        status: 'pass', 
        details: { 
          certificate: 'valid',
          issuer: "Let's Encrypt",
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      };
    } catch (error: any) {
      return { 
        status: 'fail', 
        details: { error: error.message }
      };
    }
  }

  private async testHttp(domain: string): Promise<{ status: string; details: any }> {
    try {
      // In production, this would test HTTP connectivity
      return { 
        status: 'pass', 
        details: { 
          responseCode: 200,
          responseTime: Math.random() * 500 + 100
        }
      };
    } catch (error: any) {
      return { 
        status: 'fail', 
        details: { error: error.message }
      };
    }
  }

  private async testRedirects(domain: string): Promise<{ status: string; details: any }> {
    try {
      // In production, this would test redirect configuration
      return { 
        status: 'pass', 
        details: { 
          httpsRedirect: true,
          wwwRedirect: false
        }
      };
    } catch (error: any) {
      return { 
        status: 'fail', 
        details: { error: error.message }
      };
    }
  }

  private generateSampleTimeSeries(timeframe: string): Array<{
    timestamp: Date;
    responseTime: number;
    status: number;
  }> {
    const points: Array<{ timestamp: Date; responseTime: number; status: number }> = [];
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720; // 30d
    
    for (let i = 0; i < hours; i++) {
      points.push({
        timestamp: new Date(Date.now() - (hours - i) * 60 * 60 * 1000),
        responseTime: Math.random() * 500 + 200,
        status: Math.random() > 0.99 ? 500 : 200
      });
    }
    
    return points;
  }

  private generateAnalyticsTimeSeries(timeframe: string): Array<{
    timestamp: Date;
    requests: number;
    responseTime: number;
    errors: number;
  }> {
    const points: Array<{
      timestamp: Date;
      requests: number;
      responseTime: number;
      errors: number;
    }> = [];
    
    const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    
    for (let i = 0; i < days; i++) {
      points.push({
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
        requests: Math.floor(Math.random() * 1000) + 500,
        responseTime: Math.random() * 200 + 300,
        errors: Math.floor(Math.random() * 10)
      });
    }
    
    return points;
  }

  // Legacy methods for backward compatibility

  async createDomainMapping(businessId: string, hostname: string): Promise<CnameInstruction> {
    const mapping = await this.createEnhancedDomainMapping(businessId, {
      domain: hostname,
      certificateType: 'letsencrypt',
      forceHttps: true,
      autoRenewal: true,
      planLevel: 'foundation',
      createdBy: businessId,
      mappingMetadata: {}
    });

    return {
      hostname: mapping.domain,
      record: {
        type: 'CNAME',
        name: mapping.domain,
        value: mapping.cnameTarget || process.env.FRONTEND_HOSTNAME!,
        ttl: 3600
      }
    };
  }

  async getDomainStats(): Promise<{
    totalMappings: number;
    verifiedMappings: number;
    pendingMappings: number;
  }> {
    const [total, verified, pending] = await Promise.all([
      DomainMapping.countDocuments(),
      DomainMapping.countDocuments({ status: 'active' }),
      DomainMapping.countDocuments({ status: 'pending_verification' })
    ]);
    
    return {
      totalMappings: total,
      verifiedMappings: verified,
      pendingMappings: pending
    };
  }
}

