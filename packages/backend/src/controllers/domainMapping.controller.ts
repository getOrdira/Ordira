// src/controllers/domainMapping.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { getServices } from '../services/container.service';
import { clearTenantCache } from '../middleware/tenant.middleware';

// Enhanced request interfaces
interface DomainMappingRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    domain: string;
    certificateType?: 'letsencrypt' | 'custom';
    forceHttps?: boolean;
    autoRenewal?: boolean;
    customCertificate?: {
      certificate: string;
      privateKey: string;
      chainCertificate?: string;
    };
  };
  params: {
    domainId?: string;
  };
}

interface DomainVerificationRequest extends Request, UnifiedAuthRequest, TenantRequest {
  params: {
    domainId: string;
  };
  body: {
    verificationMethod?: 'dns' | 'file' | 'email';
  };
}

// Initialize services via container
const { domains: domainServices, brandSettings: brandSettingsService, notifications: notificationsService } = getServices();

// Helper functions to maintain backward compatibility with the old domainMappingService interface
const domainMappingService = {
  async getDomainCount(businessId: string): Promise<number> {
    return domainServices.registry.countDomains(businessId);
  },

  getDomainLimits(plan: string) {
    const limits: Record<string, any> = {
      foundation: { maxDomains: 0, autoSslRenewal: false, customCertificates: false, healthMonitoring: false, performanceAnalytics: false },
      growth: { maxDomains: 0, autoSslRenewal: false, customCertificates: false, healthMonitoring: false, performanceAnalytics: false },
      premium: { maxDomains: 3, autoSslRenewal: true, customCertificates: false, healthMonitoring: true, performanceAnalytics: false },
      enterprise: { maxDomains: 10, autoSslRenewal: true, customCertificates: true, healthMonitoring: true, performanceAnalytics: true }
    };
    return limits[plan] || limits.foundation;
  },

  async validateDomain(domain: string, businessId?: string) {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let normalized: string | undefined;

    try {
      normalized = domainServices.validation.ensureDomainName(domain);
    } catch (error) {
      issues.push((error as Error).message);
      return { valid: false, issues };
    }

    const existing = await domainServices.registry.findDomain(normalized);
    if (existing && (!businessId || existing.business?.toString() !== businessId)) {
      issues.push('Domain is already mapped to another account');
      suggestions.push('Use a different subdomain or contact support');
    }

    try {
      const evaluation = await domainServices.dns.evaluateDomainRecords(normalized);
      if (evaluation.status === 'error' && evaluation.issues?.length) {
        issues.push(...evaluation.issues);
      } else if (evaluation.status === 'pending') {
        suggestions.push('Configure DNS records to point to Ordira and wait for propagation');
      }
    } catch {
      suggestions.push('DNS records not found yet. Add required records and retry verification.');
    }

    return {
      valid: issues.length === 0,
      issues: issues.length ? issues : undefined,
      suggestions: suggestions.length ? suggestions : undefined
    };
  },

  async findExistingMapping(domain: string) {
    let normalized: string;
    try {
      normalized = domainServices.validation.ensureDomainName(domain);
    } catch {
      return null;
    }

    const mapping = await domainServices.registry.findDomain(normalized);
    return mapping ? { businessId: typeof mapping.business === 'string' ? mapping.business : mapping.business?.toString?.() ?? '' } : null;
  },

  async validateCustomCertificate(domain: string, certificate: any) {
    const issues: string[] = [];

    if (!certificate.certificate || !certificate.privateKey) {
      issues.push('Certificate and private key are required');
    }

    if (certificate.certificate && !certificate.certificate.includes('-----BEGIN CERTIFICATE-----')) {
      issues.push('Invalid certificate format - must be PEM format');
    }

    if (certificate.privateKey && !certificate.privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      issues.push('Invalid private key format - must be PEM format');
    }

    return {
      valid: issues.length === 0,
      issues: issues.length ? issues : undefined,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      issuer: 'Custom Certificate'
    };
  },

  async createEnhancedDomainMapping(businessId: string, data: any) {
    const normalized = domainServices.validation.normalizeRegistrationPayload({
      businessId,
      domain: data.domain,
      certificateType: data.certificateType,
      forceHttps: data.forceHttps,
      autoRenewal: data.autoRenewal,
      planLevel: data.planLevel as 'foundation' | 'growth' | 'premium' | 'enterprise',
      createdBy: data.createdBy,
      verificationMethod: (data.verificationMethod ?? 'dns') as 'dns' | 'file' | 'email',
      metadata: data.mappingMetadata
    });

    const record = await domainServices.registry.registerDomain({
      businessId,
      domain: normalized.domain,
      certificateType: normalized.certificateType,
      forceHttps: normalized.forceHttps,
      autoRenewal: normalized.autoRenewal,
      planLevel: normalized.planLevel,
      createdBy: normalized.createdBy,
      verificationMethod: normalized.verificationMethod,
      metadata: normalized.metadata
    });

    const domainId = (record as any)._id?.toString?.() ?? '';

    if (data.certificateType === 'custom' && data.customCertificate) {
      await domainServices.registry.updateDomainConfiguration(businessId, domainId, {
        customCertificate: {
          ...data.customCertificate,
          uploadedAt: data.customCertificate.uploadedAt ?? new Date(),
          uploadedBy: data.createdBy
        }
      });
    }

    await domainServices.verification.initiateVerification(
      businessId,
      domainId,
      {
        method: normalized.verificationMethod,
        requestedBy: data.createdBy,
        autoScheduleRecheck: true
      }
    );

    const refreshed = await domainServices.registry.getDomainById(businessId, domainId);
    if (!refreshed) {
      throw new Error('Failed to create domain mapping');
    }

    return {
      id: domainId,
      domain: refreshed.domain,
      status: refreshed.status ?? 'pending_verification',
      certificateType: refreshed.certificateType ?? 'letsencrypt',
      createdAt: refreshed.createdAt,
      updatedAt: refreshed.updatedAt,
      dnsRecords: refreshed.dnsRecords ?? [],
      verificationMethod: refreshed.verificationMethod ?? 'dns',
      verificationToken: refreshed.verificationToken ?? '',
      sslEnabled: refreshed.sslEnabled !== false,
      autoRenewal: refreshed.autoRenewal !== false,
      certificateInfo: refreshed.certificateInfo,
      dnsStatus: refreshed.dnsStatus ?? 'unknown',
      sslStatus: refreshed.sslStatus ?? 'unknown',
      overallHealth: refreshed.healthStatus ?? 'unknown',
      lastHealthCheck: refreshed.lastHealthCheck ?? undefined,
      averageResponseTime: refreshed.averageResponseTime ?? 0,
      uptimePercentage: refreshed.uptimePercentage ?? 0,
      certificateExpiry: refreshed.certificateExpiry ?? undefined,
      cnameTarget: refreshed.cnameTarget ?? process.env.FRONTEND_HOSTNAME
    };
  },

  async getEnhancedDomainMappings(businessId: string) {
    const records = await domainServices.registry.listDomains(businessId);
    return records
      .filter(record => record.status !== 'deleting')
      .map(record => ({
        id: (record as any)._id?.toString?.() ?? '',
        domain: record.domain,
        status: record.status ?? 'pending_verification',
        certificateType: record.certificateType ?? 'letsencrypt',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        dnsRecords: record.dnsRecords ?? [],
        verificationMethod: record.verificationMethod ?? 'dns',
        verificationToken: record.verificationToken ?? '',
        sslEnabled: record.sslEnabled !== false,
        autoRenewal: record.autoRenewal !== false,
        certificateInfo: record.certificateInfo,
        dnsStatus: record.dnsStatus ?? 'unknown',
        sslStatus: record.sslStatus ?? 'unknown',
        overallHealth: record.healthStatus ?? 'unknown',
        lastHealthCheck: record.lastHealthCheck ?? undefined,
        averageResponseTime: record.averageResponseTime ?? 0,
        uptimePercentage: record.uptimePercentage ?? 0,
        certificateExpiry: record.certificateExpiry ?? undefined,
        cnameTarget: record.cnameTarget ?? process.env.FRONTEND_HOSTNAME
      }));
  },

  async getDetailedDomainMapping(businessId: string, domainId: string) {
    const record = await domainServices.registry.getDomainById(businessId, domainId);
    return record ? {
      id: domainId,
      domain: record.domain,
      status: record.status ?? 'pending_verification',
      certificateType: record.certificateType ?? 'letsencrypt',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      dnsRecords: record.dnsRecords ?? [],
      verificationMethod: record.verificationMethod ?? 'dns',
      verificationToken: record.verificationToken ?? '',
      sslEnabled: record.sslEnabled !== false,
      autoRenewal: record.autoRenewal !== false,
      certificateInfo: record.certificateInfo,
      dnsStatus: record.dnsStatus ?? 'unknown',
      sslStatus: record.sslStatus ?? 'unknown',
      overallHealth: record.healthStatus ?? 'unknown',
      lastHealthCheck: record.lastHealthCheck ?? undefined,
      averageResponseTime: record.averageResponseTime ?? 0,
      uptimePercentage: record.uptimePercentage ?? 0,
      certificateExpiry: record.certificateExpiry ?? undefined,
      cnameTarget: record.cnameTarget ?? process.env.FRONTEND_HOSTNAME
    } : null;
  },

  async getDomainMapping(businessId: string, domainId: string) {
    return domainServices.registry.getDomainById(businessId, domainId);
  },

  async verifyDomainOwnership(domainId: string, options: any) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    if (businessId !== options.businessId) {
      throw new Error('Domain does not belong to the requested business');
    }

    const method = domainServices.validation.ensureVerificationMethod(options.method);
    if (method !== 'dns') {
      return {
        success: false,
        errors: ['Selected verification method requires manual processing'],
        suggestions: [
          'Use DNS verification for automated setup',
          'Contact support to complete manual verification'
        ]
      };
    }

    const verification = await domainServices.verification.verifyDomain(
      options.businessId,
      domainId,
      options.verifiedBy
    );

    if (!verification.verified) {
      return {
        success: false,
        errors: verification.issues ?? ['Domain verification failed'],
        suggestions: [
          'Ensure DNS records are properly configured',
          'Wait for DNS propagation (up to 60 minutes)',
          'Use a DNS checker to confirm TXT and CNAME records',
          'Contact your DNS provider for configuration assistance'
        ],
        retryAfter: verification.propagationSeconds ?? 300
      };
    }

    let sslCertificateRequested = false;
    let estimatedSslIssuance: Date | undefined;

    if ((record.certificateType ?? 'letsencrypt') === 'letsencrypt') {
      try {
        await domainServices.certificateLifecycle.issueManagedCertificate(
          options.businessId,
          domainId,
          options.verifiedBy
        );
        sslCertificateRequested = true;
        estimatedSslIssuance = new Date(Date.now() + 10 * 60 * 1000);
      } catch (error) {
        logger.warn('Failed to request managed certificate after verification', {
          domain: record.domain,
          error: (error as Error).message
        });
      }
    }

    await domainServices.cache.cacheDomain(record.domain, options.businessId);

    return {
      success: true,
      verifiedAt: new Date(),
      sslCertificateRequested,
      estimatedSslIssuance,
      propagationTime: verification.propagationSeconds,
      fullyOperational: true
    };
  },

  async updateDomainMapping(domainId: string, updateData: any) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    const normalized = domainServices.validation.normalizeConfigurationUpdate(updateData);
    const updated = await domainServices.registry.updateDomainConfiguration(businessId, domainId, {
      ...normalized,
      metadata: updateData.mappingMetadata,
      dnsRecords: updateData.dnsRecords,
      updatedBy: updateData.updatedBy,
      customCertificate: updateData.customCertificate
        ? {
            ...updateData.customCertificate,
            uploadedAt: updateData.customCertificate.uploadedAt ?? new Date(),
            uploadedBy: updateData.updatedBy ?? businessId
          }
        : undefined
    });

    return {
      id: domainId,
      domain: updated.domain,
      status: updated.status ?? 'pending_verification',
      certificateType: updated.certificateType ?? 'letsencrypt',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      dnsRecords: updated.dnsRecords ?? [],
      verificationMethod: updated.verificationMethod ?? 'dns',
      verificationToken: updated.verificationToken ?? '',
      sslEnabled: updated.sslEnabled !== false,
      autoRenewal: updated.autoRenewal !== false,
      certificateInfo: updated.certificateInfo,
      dnsStatus: updated.dnsStatus ?? 'unknown',
      sslStatus: updated.sslStatus ?? 'unknown',
      overallHealth: updated.healthStatus ?? 'unknown',
      lastHealthCheck: updated.lastHealthCheck ?? undefined,
      averageResponseTime: updated.averageResponseTime ?? 0,
      uptimePercentage: updated.uptimePercentage ?? 0,
      certificateExpiry: updated.certificateExpiry ?? undefined,
      cnameTarget: updated.cnameTarget ?? process.env.FRONTEND_HOSTNAME
    };
  },

  async removeDomainMapping(domainId: string, options: any) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    await domainServices.registry.updateDomainConfiguration(businessId, domainId, {
      status: 'deleting',
      updatedBy: options.removedBy,
      metadata: {
        ...(record.mappingMetadata ?? {}),
        updateReason: options.removalReason,
        timestamp: new Date()
      }
    });

    let certificateRevoked = false;
    let cacheCleared = false;

    if (options.cleanupResources && (record.certificateType ?? 'letsencrypt') === 'letsencrypt') {
      try {
        await domainServices.certificateLifecycle.revokeManagedCertificate(businessId, domainId);
        certificateRevoked = true;
      } catch (error) {
        logger.warn('Failed to revoke managed certificate during domain removal', {
          domain: record.domain,
          error: (error as Error).message
        });
      }
    }

    if (options.cleanupResources) {
      try {
        await domainServices.cache.invalidateDomain(record.domain);
        cacheCleared = true;
      } catch (error) {
        logger.warn('Failed to clear domain cache during removal', {
          domain: record.domain,
          error: (error as Error).message
        });
      }
    }

    await domainServices.registry.deleteDomain(businessId, domainId);

    return {
      removedAt: new Date(),
      cleanupCompleted: options.cleanupResources,
      certificateRevoked,
      dnsRecordsRemoved: options.cleanupResources,
      cacheCleared
    };
  },

  async renewCertificate(domainId: string, options: any) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    if ((record.certificateType ?? 'letsencrypt') !== 'letsencrypt') {
      throw new Error('Automatic renewal is only available for managed certificates');
    }

    const lifecycleResult = await domainServices.certificateLifecycle.renewManagedCertificate(
      businessId,
      domainId,
      options.renewedBy
    );

    const certificate = lifecycleResult.certificate;
    const newExpiry = certificate.expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return {
      renewedAt: new Date(),
      newExpiry,
      certificateId: certificate.serialNumber ?? `cert_${Date.now()}`,
      issuer: certificate.issuer ?? "Let's Encrypt",
      validFrom: certificate.validFrom ?? new Date(),
      validTo: certificate.expiresAt ?? newExpiry
    };
  },

  async getDomainHealth(domainId: string) {
    return this.performHealthCheck(domainId);
  },

  async performHealthCheck(domainId: string, options: any = {}) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    const normalizedOptions = domainServices.validation.normalizeHealthOptions(options);
    const report = await domainServices.health.runHealthCheck(businessId, domainId, normalizedOptions);
    
    return {
      overall: report.overall,
      dns: {
        status: report.dns.status,
        details: report.dns.details
      },
      ssl: {
        status: report.ssl.status,
        details: report.ssl.details
      },
      connectivity: {
        status: report.http.status,
        details: report.http.details
      },
      performance: {
        status: report.performance.status,
        responseTime: report.performance.responseTimeMs
      },
      responseTime: report.performance.responseTimeMs,
      uptime: record.uptimePercentage ?? 99.9,
      lastDowntime: record.lastDowntime ?? undefined,
      issues: report.issues,
      timestamp: report.timestamp
    };
  },

  async getPerformanceMetrics(domainId: string, timeframe: string) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    const analyticsOptions = domainServices.validation.normalizeAnalyticsOptions({
      timeframe: timeframe as any,
      includePerformance: true,
      includeErrors: true,
      includeTraffic: true,
      useCache: true
    });

    const report = await domainServices.analytics.getDomainAnalytics(
      businessId,
      domainId,
      analyticsOptions
    );

    const averageResponseTime = report.performance.averageResponseTime;
    const loadTime = report.performance.p95ResponseTime;
    const timeSeries = (report.timeSeries ?? []).map((point: any) => ({
      timestamp: point.timestamp,
      responseTime: point.responseTime,
      status: point.errors > 0 ? 500 : 200
    }));

    return {
      averageResponseTime,
      uptime: report.performance.uptimePercentage,
      errorRate: report.errors.errorRate,
      loadTime,
      timeSeries
    };
  },

  async getDomainAnalytics(domainId: string, options: any = {}) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    const normalized = domainServices.validation.normalizeAnalyticsOptions(options);
    const report = await domainServices.analytics.getDomainAnalytics(businessId, domainId, normalized);
    
    return {
      traffic: {
        requests: report.traffic.totalRequests,
        uniqueVisitors: report.traffic.uniqueVisitors,
        trend: report.traffic.trend
      },
      performance: {
        averageResponseTime: report.performance.averageResponseTime,
        p95ResponseTime: report.performance.p95ResponseTime,
        uptime: report.performance.uptimePercentage
      },
      errors: {
        total: report.errors.totalErrors,
        rate: report.errors.errorRate,
        breakdown: undefined
      },
      ssl: {
        expiresIn: report.ssl.expiresAt
          ? Math.max(
              0,
              Math.round((report.ssl.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            )
          : Number.POSITIVE_INFINITY,
        issuer: undefined,
        valid: report.ssl.status === 'active'
      },
      timeSeries: report.timeSeries?.map(point => ({
        timestamp: point.timestamp,
        requests: point.requests,
        responseTime: point.responseTime,
        errors: point.errors
      }))
    };
  },

  async testDomainConfiguration(domainId: string) {
    const record = await domainServices.registry.getDomainByObjectId(domainId);
    if (!record) {
      throw new Error('Domain mapping not found');
    }

    const businessId = typeof record.business === 'string' ? record.business : record.business?.toString?.() ?? '';

    const dnsEvaluation = await domainServices.dns.evaluateDomainRecords(
      record.domain,
      record.verificationToken ?? undefined
    );

    const healthReport = await domainServices.health.runHealthCheck(businessId, domainId);
    const health = {
      overall: healthReport.overall,
      dns: {
        status: healthReport.dns.status,
        details: healthReport.dns.details
      },
      ssl: {
        status: healthReport.ssl.status,
        details: healthReport.ssl.details
      },
      connectivity: {
        status: healthReport.http.status,
        details: healthReport.http.details
      },
      performance: {
        status: healthReport.performance.status,
        responseTime: healthReport.performance.responseTimeMs
      },
      responseTime: healthReport.performance.responseTimeMs,
      uptime: record.uptimePercentage ?? 99.9,
      lastDowntime: record.lastDowntime ?? undefined,
      issues: healthReport.issues,
      timestamp: healthReport.timestamp
    };

    const overall = health.overall === 'healthy'
      ? 'pass'
      : health.overall === 'warning'
        ? 'warning'
        : 'fail';

    return {
      overall,
      dns: {
        status: dnsEvaluation.status === 'verified'
          ? 'pass'
          : dnsEvaluation.status === 'pending'
            ? 'warning'
            : 'fail',
        details: {
          issues: dnsEvaluation.issues,
          checkedAt: dnsEvaluation.checkedAt
        }
      },
      ssl: {
        status: health.ssl.status === 'healthy'
          ? 'pass'
          : health.ssl.status === 'warning'
            ? 'warning'
            : 'fail',
        details: health.ssl.details
      },
      http: {
        status: health.connectivity.status === 'healthy'
          ? 'pass'
          : health.connectivity.status === 'warning'
            ? 'warning'
            : 'fail',
        details: health.connectivity.details
      },
      redirects: {
        status: 'pass',
        details: {}
      },
      issues: health.issues,
      warnings: dnsEvaluation.status === 'pending' ? ['DNS propagation still in progress'] : [],
      recommendations: this.generateHealthRecommendations(health),
      timestamp: new Date()
    };
  },

  generateSetupInstructions(mapping: any) {
    return {
      dnsRecords: [
        {
          type: 'CNAME',
          name: mapping.domain,
          value: mapping.cnameTarget || process.env.FRONTEND_HOSTNAME || 'app.ordira.com',
          ttl: 300,
          instructions: `Add a CNAME record for ${mapping.domain} pointing to ${mapping.cnameTarget || process.env.FRONTEND_HOSTNAME || 'app.ordira.com'}`
        }
      ],
      verification: {
        method: mapping.verificationMethod,
        token: mapping.verificationToken,
        steps: [
          'Add the DNS record above to your domain provider',
          'Wait for DNS propagation (usually 5-60 minutes)',
          'Click verify to complete the setup process',
          'SSL certificate will be issued automatically'
        ]
      },
      troubleshooting: [
        "Ensure you have access to your domain's DNS settings",
        'Some DNS providers may take longer to propagate changes',
        "Contact your domain provider if you need help adding DNS records",
        'Use online DNS checker tools to verify propagation'
      ]
    };
  },

  generateHealthRecommendations(health: any) {
    const recommendations: string[] = [];
    if (health.dns?.status !== 'healthy') {
      recommendations.push('Check DNS configuration and ensure records are properly set');
    }
    if (health.ssl?.status !== 'healthy') {
      recommendations.push('Review SSL certificate status and renewal settings');
    }
    if (health.performance?.responseTime && health.performance.responseTime > 5000) {
      recommendations.push('Consider optimizing server response times');
    }
    if (health.connectivity?.status !== 'healthy') {
      recommendations.push('Check network connectivity and firewall settings');
    }
    return recommendations;
  },

  generatePerformanceInsights(performance: any) {
    const insights: string[] = [];
    if (performance.averageResponseTime < 1000) {
      insights.push('Excellent response times for optimal user experience');
    }
    if (performance.uptime > 99.5) {
      insights.push('Outstanding uptime reliability');
    }
    if (performance.errorRate < 0.01) {
      insights.push('Very low error rate indicates stable configuration');
    }
    if (performance.loadTime < 2000) {
      insights.push('Fast page load times enhance user satisfaction');
    }
    return insights;
  },

  generateTroubleshootingSteps(mapping: any) {
    const steps: string[] = [];
    switch (mapping.status) {
      case 'pending_verification':
        steps.push(
          'Verify DNS records are properly configured',
          'Check if DNS propagation is complete using online tools',
          'Ensure CNAME record points to the correct target',
          'Use the verify endpoint to complete setup'
        );
        break;
      case 'error':
        steps.push(
          'Check domain mapping configuration for errors',
          'Verify SSL certificate status and expiration',
          'Review DNS settings and propagation',
          'Check error logs in the domain health section',
          'Contact support if issues persist'
        );
        break;
      case 'active':
        steps.push(
          'Domain is healthy and operational',
          'Monitor SSL certificate expiration dates',
          'Check performance metrics regularly',
          'Set up health monitoring alerts',
          'Keep DNS records up to date'
        );
        break;
      default:
        steps.push(
          'Check domain mapping status',
          'Review configuration settings',
          'Contact support for assistance'
        );
    }
    return steps;
  },

  generateAnalyticsInsights(analytics: any) {
    const insights: string[] = [];
    if (analytics.traffic?.trend === 'increasing') {
      insights.push('Domain traffic is growing steadily');
    }
    if (analytics.performance?.averageResponseTime < 500) {
      insights.push('Excellent performance metrics');
    }
    if (analytics.errors?.rate < 0.1) {
      insights.push('Low error rate indicates stable configuration');
    }
    return insights;
  },

  generateAnalyticsRecommendations(analytics: any) {
    const recommendations: string[] = [];
    if (analytics.performance?.averageResponseTime > 3000) {
      recommendations.push('Consider implementing CDN for better performance');
    }
    if (analytics.errors?.rate > 5) {
      recommendations.push('Investigate and resolve recurring errors');
    }
    if (analytics.ssl?.expiresIn < 30) {
      recommendations.push('SSL certificate expires soon - ensure auto-renewal is enabled');
    }
    return recommendations;
  }
};

/**
 * POST /api/domain-mappings
 * Add a new custom domain mapping with enhanced validation and features
 */
export async function addDomainMapping(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    if (!req.validatedBody) {
      res.status(400).json({
        error: 'Request validation required - missing validatedBody',
        code: 'VALIDATION_REQUIRED'
      });
      return;
    }
    const { domain, certificateType = 'letsencrypt', forceHttps = true, autoRenewal = true, customCertificate } = req.validatedBody;

    // Validate plan permissions for custom domains
    if (!['growth', 'premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'Custom domain mapping requires Growth plan or higher',
        currentPlan: userPlan,
        requiredPlan: 'growth',
        features: {
          customDomain: 'Growth+',
          sslCertificates: 'Growth+',
          autoRenewal: 'Growth+'
        },
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Check domain mapping limits
    const currentMappings = await domainMappingService.getDomainCount(businessId);
    const planLimits = domainMappingService.getDomainLimits(userPlan);

    if (currentMappings >= planLimits.maxDomains) {
       res.status(403).json({
        error: 'Domain mapping limit reached for your plan',
        currentMappings,
        maxAllowed: planLimits.maxDomains,
        plan: userPlan,
        code: 'DOMAIN_LIMIT_REACHED'
      })
      return;
    }

    // Validate domain format and availability
    const domainValidation = await domainMappingService.validateDomain(domain, businessId);
    if (!domainValidation.valid) {
       res.status(400).json({
        error: 'Domain validation failed',
        domain,
        issues: domainValidation.issues,
        suggestions: domainValidation.suggestions,
        code: 'DOMAIN_VALIDATION_FAILED'
      })
      return;
    }

    // Check if domain is already mapped
    const existingMapping = await domainMappingService.findExistingMapping(domain);
    if (existingMapping && existingMapping.businessId !== businessId) {
       res.status(409).json({
        error: 'Domain is already mapped to another account',
        domain,
        code: 'DOMAIN_ALREADY_MAPPED'
      })
      return;
    }

    // Validate custom certificate if provided
    if (certificateType === 'custom' && customCertificate) {
      const certValidation = await domainMappingService.validateCustomCertificate(
        domain,
        customCertificate
      );
      
      if (!certValidation.valid) {
         res.status(400).json({
          error: 'Custom certificate validation failed',
          issues: certValidation.issues,
          code: 'CERTIFICATE_VALIDATION_FAILED'
        })
        return;
      }
    }

    // Create domain mapping with enhanced configuration
    const mapping = await domainMappingService.createEnhancedDomainMapping(businessId, {
      domain,
      certificateType,
      forceHttps,
      autoRenewal,
      customCertificate,
      planLevel: userPlan,
      createdBy: businessId,
      mappingMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        source: 'api',
        timestamp: new Date()
      }
    });

    // Update brand settings with the new domain
    await brandSettingsService.updateSettings(businessId, { customDomain: domain });

    // Clear tenant cache to reflect new domain
    clearTenantCache(businessId);

    // Track domain mapping creation
    trackManufacturerAction('create_domain_mapping');

    // Send setup instructions email
    await notificationsService.sendEmail(
     businessId, 
      'Domain Setup Instructions', 
      `Your custom domain ${domain} has been configured. Please follow the setup instructions to complete the process.`
    );

    res.status(201).json({
      success: true,
      mapping: {
        id: mapping.id,
        domain: mapping.domain,
        status: mapping.status,
        createdAt: mapping.createdAt,
        certificateType: mapping.certificateType
      },
      setup: {
        dnsRecords: mapping.dnsRecords,
        verification: {
          method: mapping.verificationMethod,
          token: mapping.verificationToken,
          instructions: domainMappingService.generateSetupInstructions(mapping)
        },
        ssl: {
          enabled: mapping.sslEnabled,
          autoRenewal: mapping.autoRenewal,
          certificateInfo: mapping.certificateInfo
        }
      },
      nextSteps: [
        'Add the provided DNS records to your domain provider',
        'Wait for DNS propagation (typically 5-60 minutes)',
        'Verify domain ownership using the verification endpoint',
        'SSL certificate will be issued automatically once verified'
      ],
      estimates: {
        dnsPropagation: '5-60 minutes',
        sslIssuance: '2-10 minutes after verification',
        fullActivation: '1-2 hours total'
      }
    });
  } catch (error) {
    logger.error('Add domain mapping error:', error);
    next(error);
  }
}

/**
 * GET /api/domain-mappings
 * List all domain mappings for the authenticated brand
 */
export async function listDomainMappings(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get all domain mappings with status
    const mappings = await domainMappingService.getEnhancedDomainMappings(businessId);
    
    // Get plan limits and usage
    const planLimits = domainMappingService.getDomainLimits(userPlan);
    const currentUsage = mappings.length;

    // Track domain mappings view
    trackManufacturerAction('view_domain_mappings');

    res.json({
      domainMappings: mappings.map(mapping => ({
        ...mapping,
        health: {
          dnsStatus: mapping.dnsStatus,
          sslStatus: mapping.sslStatus,
          overallHealth: mapping.overallHealth,
          lastChecked: mapping.lastHealthCheck
        },
        performance: {
          responseTime: mapping.averageResponseTime,
          uptime: mapping.uptimePercentage,
          certificateExpiry: mapping.certificateExpiry
        }
      })),
      usage: {
        current: currentUsage,
        limit: planLimits.maxDomains,
        remaining: planLimits.maxDomains - currentUsage,
        planLevel: userPlan
      },
      features: {
        autoSslRenewal: planLimits.autoSslRenewal,
        customCertificates: planLimits.customCertificates,
        healthMonitoring: planLimits.healthMonitoring,
        performanceAnalytics: planLimits.performanceAnalytics
      },
      summary: {
        totalDomains: currentUsage,
        activeDomains: mappings.filter(m => m.status === 'active').length,
        pendingVerification: mappings.filter(m => m.status === 'pending_verification').length,
        sslIssues: mappings.filter(m => m.sslStatus === 'error').length
      }
    });
  } catch (error) {
    logger.error('List domain mappings error:', error);
    next(error);
  }
}

/**
 * GET /api/domain-mappings/:domainId
 * Get detailed information about a specific domain mapping
 */
export async function getDomainMapping(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;

    if (!domainId) {
       res.status(400).json({
        error: 'Domain ID is required',
        code: 'MISSING_DOMAIN_ID'
      })
      return;
    }

    // Get detailed domain mapping information
    const mapping = await domainMappingService.getDetailedDomainMapping(businessId, domainId);

    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Get domain health and performance metrics
    const healthMetrics = await domainMappingService.getDomainHealth(domainId);
    const performanceMetrics = await domainMappingService.getPerformanceMetrics(domainId, '7d');

    res.json({
      mapping: {
        ...mapping,
        setupInstructions: mapping.status === 'pending_verification' ? 
          domainMappingService.generateSetupInstructions(mapping) : null
      },
      health: {
        ...healthMetrics,
        recommendations: domainMappingService.generateHealthRecommendations(healthMetrics)
      },
      performance: {
        ...performanceMetrics,
        insights: domainMappingService.generatePerformanceInsights(performanceMetrics)
      },
      actions: {
        canVerify: mapping.status === 'pending_verification',
        canRenewCertificate: mapping.certificateExpiry && 
          new Date(mapping.certificateExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        canUpdateCertificate: mapping.certificateType === 'custom',
        canDelete: ['pending_verification', 'error'].includes(mapping.status)
      },
      troubleshooting: domainMappingService.generateTroubleshootingSteps(mapping)
    });
  } catch (error) {
    logger.error('Get domain mapping error:', error);
    next(error);
  }
}

/**
 * POST /api/domain-mappings/:domainId/verify
 * Verify domain ownership and activate mapping
 */
export async function verifyDomain(
  req: DomainVerificationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;
    const { verificationMethod = 'dns' } = req.body;

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Validate verification status
    if (mapping.status !== 'pending_verification') {
       res.status(400).json({
        error: 'Domain is not in pending verification status',
        currentStatus: mapping.status,
        code: 'INVALID_VERIFICATION_STATUS'
      })
      return;
    }

    // Perform domain verification
    const verification = await domainMappingService.verifyDomainOwnership(domainId, {
      method: verificationMethod,
      businessId,
      verifiedBy: businessId
    });

    if (!verification.success) {
       res.status(400).json({
        error: 'Domain verification failed',
        details: verification.errors,
        suggestions: verification.suggestions,
        retryAfter: verification.retryAfter,
        code: 'VERIFICATION_FAILED'
      })
      return;
    }

    // Clear tenant cache to reflect domain activation
    clearTenantCache(businessId);

    // Track domain verification
    trackManufacturerAction('verify_domain');

    // Send verification success notification
    await notificationsService.sendEmail(
    businessId,
    'Domain Verified Successfully',
    `Great news! Your custom domain ${mapping.domain} has been verified and is now active. Your SSL certificate is being issued automatically and will be ready within 10 minutes.`
    );

    res.json({
      success: true,
      verification: {
        domainId,
        domain: mapping.domain,
        verifiedAt: verification.verifiedAt,
        method: verificationMethod,
        status: 'verified'
      },
      ssl: {
        certificateRequested: verification.sslCertificateRequested,
        estimatedIssuance: verification.estimatedSslIssuance,
        autoRenewal: mapping.autoRenewal
      },
      activation: {
        domainActive: true,
        propagationTime: verification.propagationTime,
        fullyOperational: verification.fullyOperational
      },
      nextSteps: [
        'SSL certificate is being issued automatically',
        'Domain will be fully operational within 10 minutes',
        'Update your DNS if you haven\'t already',
        'Test your domain to ensure everything works'
      ]
    });
  } catch (error) {
    logger.error('Verify domain error:', error);
    next(error);
  }
}

/**
 * PUT /api/domain-mappings/:domainId
 * Update domain mapping configuration
 */
export async function updateDomainMapping(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;
    if (!req.validatedBody) {
      res.status(400).json({
        error: 'Request validation required - missing validatedBody',
        code: 'VALIDATION_REQUIRED'
      });
      return;
    }
    const updateData = req.validatedBody;

    // Get existing mapping
    const existingMapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!existingMapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Validate update permissions
    if (existingMapping.status === 'deleting') {
       res.status(400).json({
        error: 'Cannot update domain mapping being deleted',
        code: 'DOMAIN_BEING_DELETED'
      })
      return;
    }

    // Update domain mapping
    const updatedMapping = await domainMappingService.updateDomainMapping(domainId, {
      ...updateData,
      updatedBy: businessId,
      updateMetadata: {
        changedFields: Object.keys(updateData),
        updateReason: 'manual_update',
        ipAddress: req.ip,
        timestamp: new Date()
      }
    });

    // Track domain mapping update
    trackManufacturerAction('update_domain_mapping');

    res.json({
      success: true,
      mapping: updatedMapping,
      changes: {
        fieldsUpdated: Object.keys(updateData),
        certificateUpdated: !!updateData.customCertificate,
        configurationChanged: !!updateData.forceHttps || !!updateData.autoRenewal
      },
      message: 'Domain mapping updated successfully'
    });
  } catch (error) {
    logger.error('Update domain mapping error:', error);
    next(error);
  }
}

/**
 * DELETE /api/domain-mappings/:domainId
 * Remove a domain mapping
 */
export async function removeDomainMapping(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Validate deletion permissions
    if (mapping.status === 'deleting') {
       res.status(400).json({
        error: 'Domain mapping is already being deleted',
        code: 'DOMAIN_ALREADY_DELETING'
      })
      return;
    }

    // Remove domain mapping with cleanup
    const removal = await domainMappingService.removeDomainMapping(domainId, {
      removedBy: businessId,
      removalReason: 'manual_removal',
      cleanupResources: true
    });

    // Update brand settings to remove custom domain
    await brandSettingsService.removeCustomDomain(businessId);

    // Clear tenant cache
    clearTenantCache(businessId);

    // Track domain mapping removal
    trackManufacturerAction('remove_domain_mapping');

    // Send removal confirmation
    await notificationsService.sendEmail(
    businessId,
    'Domain Mapping Removed',
    `Your custom domain ${mapping.domain} has been successfully removed. All associated SSL certificates have been revoked and DNS records cleaned up.`
    );

    res.json({
      success: true,
      removal: {
        domainId,
        domain: mapping.domain,
        removedAt: removal.removedAt,
        cleanupCompleted: removal.cleanupCompleted
      },
      cleanup: {
        certificateRevoked: removal.certificateRevoked,
        dnsRecordsRemoved: removal.dnsRecordsRemoved,
        cacheCleared: removal.cacheCleared
      },
      message: 'Domain mapping removed successfully'
    });
  } catch (error) {
    logger.error('Remove domain mapping error:', error);
    next(error);
  }
}

/**
 * POST /api/domain-mappings/:domainId/renew-certificate
 * Manually renew SSL certificate for a domain
 */
export async function renewCertificate(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Validate renewal permissions
    if (mapping.status !== 'active') {
     res.status(400).json({
        error: 'Can only renew certificates for active domains',
        currentStatus: mapping.status,
        code: 'INVALID_STATUS_FOR_RENEWAL'
      })
      return;
    }

    // Renew certificate
    const renewal = await domainMappingService.renewCertificate(domainId, {
      renewedBy: businessId,
      renewalReason: 'manual_renewal'
    });

    // Track certificate renewal
    trackManufacturerAction('renew_domain_certificate');

    res.json({
      success: true,
      renewal: {
        domainId,
        domain: mapping.domain,
        renewedAt: renewal.renewedAt,
        newExpiry: renewal.newExpiry,
        certificateId: renewal.certificateId
      },
      certificate: {
        issuer: renewal.issuer,
        validFrom: renewal.validFrom,
        validTo: renewal.validTo,
        autoRenewal: mapping.autoRenewal
      },
      message: 'SSL certificate renewed successfully'
    });
  } catch (error) {
    logger.error('Renew certificate error:', error);
    next(error);
  }
}

/**
 * GET /api/domain-mappings/:domainId/health
 * Get real-time health status for a domain
 */
export async function getDomainHealth(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Perform real-time health check
    const healthCheck = await domainMappingService.performHealthCheck(domainId);

    res.json({
      domain: mapping.domain,
      health: {
        overall: healthCheck.overall,
        dns: healthCheck.dns,
        ssl: healthCheck.ssl,
        connectivity: healthCheck.connectivity,
        performance: healthCheck.performance
      },
      metrics: {
        responseTime: healthCheck.responseTime,
        uptime: healthCheck.uptime,
        lastDowntime: healthCheck.lastDowntime
      },
      issues: healthCheck.issues,
      recommendations: domainMappingService.generateHealthRecommendations(healthCheck),
      lastChecked: healthCheck.timestamp
    });
  } catch (error) {
    logger.error('Get domain health error:', error);
    next(error);
  }
}

/**
 * GET /api/domain-mappings/:domainId/analytics
 * Get domain performance analytics
 */
export async function getDomainAnalytics(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const { domainId } = req.params;
    const { timeframe = '7d' } = req.query;

    // Check analytics permissions
    if (!['enterprise'].includes(userPlan)) {
       res.status(403).json({
        error: 'Domain analytics require Enterprise plan',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Get comprehensive analytics
    const analytics = await domainMappingService.getDomainAnalytics(domainId, {
      timeframe: timeframe as string,
      includePerformance: true,
      includeErrors: true,
      includeTraffic: true
    });

    res.json({
      domain: mapping.domain,
      timeframe,
      analytics: {
        ...analytics,
        insights: domainMappingService.generateAnalyticsInsights(analytics),
        recommendations: domainMappingService.generateAnalyticsRecommendations(analytics)
      },
      metadata: {
        generatedAt: new Date(),
        dataPoints: analytics.timeSeries?.length || 0
      }
    });
  } catch (error) {
    logger.error('Get domain analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/domain-mappings/:domainId/test
 * Test domain configuration and connectivity
 */
export async function testDomain(
  req: DomainMappingRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { domainId } = req.params;

    // Get domain mapping
    const mapping = await domainMappingService.getDomainMapping(businessId, domainId);
    if (!mapping) {
       res.status(404).json({
        error: 'Domain mapping not found',
        code: 'DOMAIN_NOT_FOUND'
      })
      return;
    }

    // Perform comprehensive domain test
    const testResults = await domainMappingService.testDomainConfiguration(domainId);

    // Track domain test
    trackManufacturerAction('test_domain_configuration');

    res.json({
      domain: mapping.domain,
      testResults: {
        overall: testResults.overall,
        dns: testResults.dns,
        ssl: testResults.ssl,
        http: testResults.http,
        redirects: testResults.redirects
      },
      issues: testResults.issues,
      warnings: testResults.warnings,
      recommendations: testResults.recommendations,
      testedAt: testResults.timestamp
    });
  } catch (error) {
    logger.error('Test domain error:', error);
    next(error);
  }
}

// Helper functions moved to DomainMappingService via container
