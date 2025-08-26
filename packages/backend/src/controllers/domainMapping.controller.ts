// src/controllers/domainMapping.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { DomainMappingService } from '../services/external/domainMapping.service';
import { BrandSettingsService } from '../services/business/brandSettings.service';
import { NotificationsService } from '../services/external/notifications.service';
import { clearTenantCache } from '../middleware/tenant.middleware';

// Enhanced request interfaces
interface DomainMappingRequest extends AuthRequest, TenantRequest, ValidatedRequest {
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

interface DomainVerificationRequest extends AuthRequest, TenantRequest {
  params: {
    domainId: string;
  };
  body: {
    verificationMethod?: 'dns' | 'file' | 'email';
  };
}

// Initialize services
const domainMappingService = new DomainMappingService();
const brandSettingsService = new BrandSettingsService();
const notificationsService = new NotificationsService();

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
    const { domain, certificateType = 'letsencrypt', forceHttps = true, autoRenewal = true, customCertificate } = req.validatedBody || req.body;

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
    const planLimits = getDomainLimits(userPlan);

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
          instructions: generateSetupInstructions(mapping)
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
    console.error('Add domain mapping error:', error);
    next(error);
  }
}

/**
 * GET /api/domain-mappings
 * List all domain mappings for the authenticated brand
 */
export async function listDomainMappings(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get all domain mappings with status
    const mappings = await domainMappingService.getEnhancedDomainMappings(businessId);
    
    // Get plan limits and usage
    const planLimits = getDomainLimits(userPlan);
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
    console.error('List domain mappings error:', error);
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
          generateSetupInstructions(mapping) : null
      },
      health: {
        ...healthMetrics,
        recommendations: generateHealthRecommendations(healthMetrics)
      },
      performance: {
        ...performanceMetrics,
        insights: generatePerformanceInsights(performanceMetrics)
      },
      actions: {
        canVerify: mapping.status === 'pending_verification',
        canRenewCertificate: mapping.certificateExpiry && 
          new Date(mapping.certificateExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        canUpdateCertificate: mapping.certificateType === 'custom',
        canDelete: ['pending_verification', 'error'].includes(mapping.status)
      },
      troubleshooting: generateTroubleshootingSteps(mapping)
    });
  } catch (error) {
    console.error('Get domain mapping error:', error);
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
    console.error('Verify domain error:', error);
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
    const updateData = req.validatedBody || req.body;

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
    console.error('Update domain mapping error:', error);
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
    console.error('Remove domain mapping error:', error);
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
    console.error('Renew certificate error:', error);
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
      recommendations: generateHealthRecommendations(healthCheck),
      lastChecked: healthCheck.timestamp
    });
  } catch (error) {
    console.error('Get domain health error:', error);
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
        insights: generateAnalyticsInsights(analytics),
        recommendations: generateAnalyticsRecommendations(analytics)
      },
      metadata: {
        generatedAt: new Date(),
        dataPoints: analytics.timeSeries?.length || 0
      }
    });
  } catch (error) {
    console.error('Get domain analytics error:', error);
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
    console.error('Test domain error:', error);
    next(error);
  }
}

// Helper functions
function getDomainLimits(plan: string) {
  const limits = {
    foundation: { 
      maxDomains: 0, 
      autoSslRenewal: false, 
      customCertificates: false, 
      healthMonitoring: false,
      performanceAnalytics: false
    },
    growth: { 
      maxDomains: 0, 
      autoSslRenewal: false, 
      customCertificates: false, 
      healthMonitoring: false,
      performanceAnalytics: false
    },
    premium: { 
      maxDomains: 3, 
      autoSslRenewal: true, 
      customCertificates: false, 
      healthMonitoring: true,
      performanceAnalytics: false
    },
    enterprise: { 
      maxDomains: 10, 
      autoSslRenewal: true, 
      customCertificates: true, 
      healthMonitoring: true,
      performanceAnalytics: true
    }
  };
  return limits[plan as keyof typeof limits] || limits.foundation;
}

function generateSetupInstructions(mapping: any): any {
  return {
    dnsRecords: [
      {
        type: 'CNAME',
        name: mapping.domain,
        value: mapping.cnameTarget,
        ttl: 300,
        instructions: `Add a CNAME record for ${mapping.domain} pointing to ${mapping.cnameTarget}`
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
      'Ensure you have access to your domain\'s DNS settings',
      'Some DNS providers may take longer to propagate changes',
      'Contact your domain provider if you need help adding DNS records',
      'Use online DNS checker tools to verify propagation'
    ]
  };
}

function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = [];
  
  if (health.dns?.status !== 'healthy') {
    recommendations.push('Check DNS configuration and ensure records are properly set');
  }
  
  if (health.ssl?.status !== 'healthy') {
    recommendations.push('Review SSL certificate status and renewal settings');
  }
  
  if (health.performance?.responseTime > 5000) {
    recommendations.push('Consider optimizing server response times');
  }
  
  if (health.connectivity?.status !== 'healthy') {
    recommendations.push('Check network connectivity and firewall settings');
  }
  
  return recommendations;
}

function generatePerformanceInsights(performance: any): string[] {
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
}

function generateTroubleshootingSteps(mapping: any): string[] {
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
}

function generateAnalyticsInsights(analytics: any): string[] {
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
}

function generateAnalyticsRecommendations(analytics: any): string[] {
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
