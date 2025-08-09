// src/controllers/certificate.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { CertificateService } from '../services/business/certificate.service';
import { BillingService } from '../services/external/billing.service';
import { NotificationsService } from '../services/external/notifications.service';
import { AnalyticsBusinessService } from '../services/business/analytics.service';

// Enhanced request interfaces
interface CertificateRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    productId: string;
    recipient: string;
    contactMethod: 'email' | 'sms' | 'wallet';
    certificateData?: {
      customMessage?: string;
      expirationDate?: Date;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
      metadata?: any;
    };
    deliveryOptions?: {
      scheduleDate?: Date;
      priority?: 'standard' | 'priority' | 'urgent';
      notifyRecipient?: boolean;
    };
    batchRequest?: boolean;
    templateId?: string;
  };
}

interface BatchCertificateRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    productId: string;
    recipients: Array<{
      address: string;
      contactMethod: 'email' | 'sms' | 'wallet';
      customData?: any;
    }>;
    batchOptions?: {
      delayBetweenCerts?: number;
      maxConcurrent?: number;
      continueOnError?: boolean;
    };
  };
}

interface CertificateSearchRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  query: {
    page?: string;
    limit?: string;
    status?: 'pending' | 'issued' | 'delivered' | 'failed' | 'expired';
    productId?: string;
    recipient?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sortBy?: 'created' | 'issued' | 'delivered' | 'status';
    sortOrder?: 'asc' | 'desc';
  };
}

// Initialize services
const certificateService = new CertificateService();
const billingService = new BillingService();
const notificationsService = new NotificationsService();
const analyticsService = new AnalyticsBusinessService();

/**
 * POST /api/certificates
 * Create a new certificate with comprehensive validation and features
 */
export async function createCertificate(
  req: CertificateRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const certificateData = req.validatedBody || req.body;

    // Check plan-based certificate limits
    const usage = await certificateService.getCurrentUsage(businessId);
    const planLimits = getPlanLimits(userPlan);

    if (usage.certificatesThisMonth >= planLimits.certificates) {
      return res.status(403).json({
        error: 'Certificate limit reached for your plan',
        usage: {
          current: usage.certificatesThisMonth,
          limit: planLimits.certificates,
          plan: userPlan
        },
        options: {
          upgradeAvailable: userPlan !== 'enterprise',
          overageAllowed: planLimits.allowOverage,
          overageCost: planLimits.overageCost
        },
        code: 'CERTIFICATE_LIMIT_REACHED'
      });
    }

    // Validate product ownership
    const productExists = await certificateService.validateProductOwnership(businessId, certificateData.productId);
    if (!productExists) {
      return res.status(404).json({
        error: 'Product not found or access denied',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Validate recipient format based on contact method
    const recipientValidation = validateRecipient(certificateData.recipient, certificateData.contactMethod);
    if (!recipientValidation.valid) {
      return res.status(400).json({
        error: 'Invalid recipient format',
        details: recipientValidation.error,
        code: 'INVALID_RECIPIENT'
      });
    }

    // Check for duplicate certificates
    const existingCert = await certificateService.findExistingCertificate(
      businessId,
      certificateData.productId,
      certificateData.recipient
    );

    if (existingCert && !existingCert.allowDuplicates) {
      return res.status(409).json({
        error: 'Certificate already exists for this recipient and product',
        existingCertificate: {
          id: existingCert.id,
          issuedAt: existingCert.issuedAt,
          status: existingCert.status
        },
        options: {
          reissue: true,
          modify: true
        },
        code: 'CERTIFICATE_ALREADY_EXISTS'
      });
    }

    // Create certificate with enhanced features
    const certificate = await certificateService.createEnhancedCertificate(businessId, {
      ...certificateData,
      planLevel: userPlan,
      createdBy: businessId,
      requestMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        source: 'api',
        timestamp: new Date()
      }
    });

    // Track certificate creation
    trackManufacturerAction('create_certificate');

    // Process billing for certificate
    if (planLimits.billPerCertificate) {
      await billingService.chargeCertificateFee(businessId, certificate.id);
    }

    // Send delivery notification based on contact method
    await processCertificateDelivery(certificate, certificateData.deliveryOptions);

    // Update usage analytics
    await analyticsService.recordCertificateCreation(businessId, certificate.id);

    res.status(201).json({
      success: true,
      certificate: {
        id: certificate.id,
        status: certificate.status,
        createdAt: certificate.createdAt,
        estimatedDelivery: certificate.estimatedDelivery,
        trackingId: certificate.trackingId
      },
      usage: {
        currentUsage: usage.certificatesThisMonth + 1,
        remainingLimit: Math.max(0, planLimits.certificates - usage.certificatesThisMonth - 1),
        planLimit: planLimits.certificates
      },
      delivery: {
        method: certificateData.contactMethod,
        scheduled: !!certificateData.deliveryOptions?.scheduleDate,
        estimatedDelivery: certificate.estimatedDelivery
      },
      nextSteps: getCertificateNextSteps(certificate.status, certificateData.contactMethod)
    });
  } catch (error) {
    console.error('Create certificate error:', error);
    next(error);
  }
}

/**
 * POST /api/certificates/batch
 * Create multiple certificates in batch with enhanced processing
 */
export async function createBatchCertificates(
  req: BatchCertificateRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const batchData = req.validatedBody || req.body;

    // Validate batch permissions
    if (!['premium', 'enterprise'].includes(userPlan)) {
      return res.status(403).json({
        error: 'Batch certificate creation requires Premium plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
    }

    const recipientCount = batchData.recipients.length;

    // Validate batch size limits
    const batchLimits = getBatchLimits(userPlan);
    if (recipientCount > batchLimits.maxBatchSize) {
      return res.status(400).json({
        error: 'Batch size exceeds plan limits',
        requestedSize: recipientCount,
        maxAllowed: batchLimits.maxBatchSize,
        code: 'BATCH_SIZE_EXCEEDED'
      });
    }

    // Check certificate limits
    const usage = await certificateService.getCurrentUsage(businessId);
    const planLimits = getPlanLimits(userPlan);
    const remainingLimit = planLimits.certificates - usage.certificatesThisMonth;

    if (recipientCount > remainingLimit) {
      return res.status(403).json({
        error: 'Insufficient certificate quota for batch',
        requested: recipientCount,
        available: remainingLimit,
        code: 'INSUFFICIENT_QUOTA'
      });
    }

    // Create batch job
    const batchJob = await certificateService.createBatchCertificateJob(businessId, {
      ...batchData,
      planLevel: userPlan,
      initiatedBy: businessId,
      jobMetadata: {
        recipientCount,
        estimatedDuration: calculateBatchDuration(recipientCount, batchData.batchOptions),
        priority: determineBatchPriority(userPlan)
      }
    });

    // Track batch creation
    trackManufacturerAction('create_batch_certificates');

    res.status(202).json({
      success: true,
      batchJob: {
        id: batchJob.id,
        status: 'queued',
        recipientCount,
        estimatedCompletion: batchJob.estimatedCompletion,
        progressUrl: `/api/certificates/batch/${batchJob.id}/progress`
      },
      processing: {
        queuePosition: batchJob.queuePosition,
        estimatedStartTime: batchJob.estimatedStartTime,
        notificationsEnabled: true
      },
      tracking: {
        webhookUrl: batchJob.webhookUrl,
        statusUpdates: true,
        completionNotification: true
      }
    });
  } catch (error) {
    console.error('Create batch certificates error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates
 * List certificates with enhanced filtering and search
 */
export async function listCertificates(
  req: CertificateSearchRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const {
      page = '1',
      limit = '20',
      status,
      productId,
      recipient,
      dateFrom,
      dateTo,
      search,
      sortBy = 'created',
      sortOrder = 'desc'
    } = req.query;

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build search options
    const searchOptions = {
      businessId,
      filters: {
        status,
        productId,
        recipient,
        dateRange: dateFrom && dateTo ? {
          from: new Date(dateFrom),
          to: new Date(dateTo)
        } : undefined,
        search
      },
      pagination: {
        page: pageNum,
        limit: limitNum
      },
      sorting: {
        field: sortBy,
        order: sortOrder as 'asc' | 'desc'
      }
    };

    // Get certificates with enhanced data
    const result = await certificateService.searchCertificates(searchOptions);

    // Get usage statistics
    const usage = await certificateService.getUsageStatistics(businessId);

    // Track certificate list view
    trackManufacturerAction('view_certificates');

    res.json({
      certificates: result.certificates,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(result.total / limitNum),
        totalResults: result.total,
        hasNextPage: pageNum < Math.ceil(result.total / limitNum),
        hasPrevPage: pageNum > 1,
        resultsPerPage: limitNum
      },
      usage: {
        thisMonth: usage.thisMonth,
        total: usage.total,
        byStatus: usage.byStatus,
        planLimit: getPlanLimits(req.tenant?.plan || 'foundation').certificates
      },
      filters: {
        availableStatuses: ['pending', 'issued', 'delivered', 'failed', 'expired'],
        availableProducts: result.availableProducts,
        dateRange: {
          earliest: usage.earliestCertificate,
          latest: usage.latestCertificate
        }
      },
      summary: {
        successRate: usage.successRate,
        averageDeliveryTime: usage.averageDeliveryTime,
        popularProducts: usage.popularProducts?.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('List certificates error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates/:id
 * Get detailed certificate information
 */
export async function getCertificate(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Certificate ID is required',
        code: 'MISSING_CERTIFICATE_ID'
      });
    }

    // Get detailed certificate information
    const certificate = await certificateService.getDetailedCertificate(businessId, id);

    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    // Get delivery history
    const deliveryHistory = await certificateService.getDeliveryHistory(id);

    // Get verification status
    const verification = await certificateService.getVerificationStatus(id);

    res.json({
      certificate: {
        ...certificate,
        deliveryHistory,
        verification
      },
      actions: {
        canResend: certificate.status === 'failed' || certificate.status === 'pending',
        canRevoke: certificate.status === 'issued' || certificate.status === 'delivered',
        canUpdate: certificate.status === 'pending',
        canDownload: certificate.status === 'issued' || certificate.status === 'delivered'
      },
      links: {
        publicView: certificate.publicViewUrl,
        download: certificate.downloadUrl,
        verify: certificate.verificationUrl
      }
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    next(error);
  }
}

/**
 * POST /api/certificates/:id/resend
 * Resend certificate to recipient
 */
export async function resendCertificate(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { id } = req.params;
    const { contactMethod, newRecipient } = req.validatedBody || req.body;

    // Get certificate
    const certificate = await certificateService.getCertificate(businessId, id);
    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    // Validate resend permissions
    if (!['failed', 'pending'].includes(certificate.status)) {
      return res.status(400).json({
        error: 'Certificate cannot be resent in current status',
        currentStatus: certificate.status,
        allowedStatuses: ['failed', 'pending'],
        code: 'INVALID_STATUS_FOR_RESEND'
      });
    }

    // Process resend
    const resendResult = await certificateService.resendCertificate(id, {
      contactMethod: contactMethod || certificate.contactMethod,
      newRecipient: newRecipient || certificate.recipient,
      resentBy: businessId,
      resendReason: 'manual_resend'
    });

    // Track resend action
    trackManufacturerAction('resend_certificate');

    res.json({
      success: true,
      certificate: {
        id: resendResult.id,
        status: resendResult.status,
        resendCount: resendResult.resendCount,
        lastResendAt: resendResult.lastResendAt
      },
      delivery: {
        method: resendResult.contactMethod,
        recipient: resendResult.recipient,
        estimatedDelivery: resendResult.estimatedDelivery
      },
      message: 'Certificate resent successfully'
    });
  } catch (error) {
    console.error('Resend certificate error:', error);
    next(error);
  }
}

/**
 * POST /api/certificates/:id/revoke
 * Revoke an issued certificate
 */
export async function revokeCertificate(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { id } = req.params;
    const { reason, notifyRecipient = true } = req.validatedBody || req.body;

    // Get certificate
    const certificate = await certificateService.getCertificate(businessId, id);
    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not found',
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    // Validate revocation permissions
    if (!['issued', 'delivered'].includes(certificate.status)) {
      return res.status(400).json({
        error: 'Certificate cannot be revoked in current status',
        currentStatus: certificate.status,
        allowedStatuses: ['issued', 'delivered'],
        code: 'INVALID_STATUS_FOR_REVOCATION'
      });
    }

    // Process revocation
    const revocation = await certificateService.revokeCertificate(id, {
      reason,
      revokedBy: businessId,
      notifyRecipient,
      revocationDate: new Date()
    });

    // Track revocation
    trackManufacturerAction('revoke_certificate');

    // Send notification if requested
    if (notifyRecipient) {
      await notificationsService.sendCertificateRevocationNotification(
        certificate.recipient,
        certificate.contactMethod,
        revocation
      );
    }

    res.json({
      success: true,
      revocation: {
        certificateId: id,
        revokedAt: revocation.revokedAt,
        reason: revocation.reason,
        revocationId: revocation.id
      },
      impact: {
        certificateInvalidated: true,
        recipientNotified: notifyRecipient,
        publicRecordUpdated: true
      },
      message: 'Certificate revoked successfully'
    });
  } catch (error) {
    console.error('Revoke certificate error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates/analytics
 * Get certificate analytics and insights
 */
export async function getCertificateAnalytics(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    // Check analytics permissions
    if (!['growth', 'premium', 'enterprise'].includes(userPlan)) {
      return res.status(403).json({
        error: 'Certificate analytics require Growth plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      });
    }

    // Get comprehensive analytics
    const analytics = await certificateService.getCertificateAnalytics(businessId, {
      timeframe: timeframe as string,
      groupBy: groupBy as string,
      includePerformance: ['premium', 'enterprise'].includes(userPlan),
      includeAdvancedMetrics: userPlan === 'enterprise'
    });

    // Track analytics view
    trackManufacturerAction('view_certificate_analytics');

    res.json({
      timeframe,
      groupBy,
      analytics: {
        ...analytics,
        insights: generateCertificateInsights(analytics),
        recommendations: generateCertificateRecommendations(analytics, userPlan)
      },
      metadata: {
        generatedAt: new Date(),
        planLevel: userPlan,
        dataPoints: analytics.timeSeries?.length || 0
      }
    });
  } catch (error) {
    console.error('Get certificate analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/certificates/batch/:batchId/progress
 * Get batch certificate processing progress
 */
export async function getBatchProgress(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { batchId } = req.params;

    // Get batch progress
    const progress = await certificateService.getBatchProgress(businessId, batchId);

    if (!progress) {
      return res.status(404).json({
        error: 'Batch job not found',
        code: 'BATCH_NOT_FOUND'
      });
    }

    res.json({
      batchJob: {
        id: progress.id,
        status: progress.status,
        createdAt: progress.createdAt,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt
      },
      progress: {
        total: progress.total,
        processed: progress.processed,
        successful: progress.successful,
        failed: progress.failed,
        percentage: Math.round((progress.processed / progress.total) * 100)
      },
      timing: {
        estimatedCompletion: progress.estimatedCompletion,
        averageProcessingTime: progress.averageProcessingTime,
        remainingTime: progress.remainingTime
      },
      errors: progress.errors?.slice(0, 10) || [], // Show first 10 errors
      nextUpdate: new Date(Date.now() + 30000) // 30 seconds from now
    });
  } catch (error) {
    console.error('Get batch progress error:', error);
    next(error);
  }
}

// Helper functions
function getPlanLimits(plan: string) {
  const limits = {
    foundation: { certificates: 50, allowOverage: false, billPerCertificate: false, overageCost: 0 },
    growth: { certificates: 150, allowOverage: false, billPerCertificate: false, overageCost: 0 },
    premium: { certificates: 500, allowOverage: true, billPerCertificate: false, overageCost: 0.1 },
    enterprise: { certificates: Infinity, allowOverage: true, billPerCertificate: false, overageCost: 0.05 }
  };
  return limits[plan as keyof typeof limits] || limits.foundation;
}

function getBatchLimits(plan: string) {
  const limits = {
    premium: { maxBatchSize: 100, maxConcurrent: 5 },
    enterprise: { maxBatchSize: 1000, maxConcurrent: 20 }
  };
  return limits[plan as keyof typeof limits] || { maxBatchSize: 10, maxConcurrent: 1 };
}

function validateRecipient(recipient: string, contactMethod: string): { valid: boolean; error?: string } {
  switch (contactMethod) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return { valid: emailRegex.test(recipient), error: !emailRegex.test(recipient) ? 'Invalid email format' : undefined };
    
    case 'sms':
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      return { valid: phoneRegex.test(recipient), error: !phoneRegex.test(recipient) ? 'Invalid phone number format' : undefined };
    
    case 'wallet':
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      return { valid: walletRegex.test(recipient), error: !walletRegex.test(recipient) ? 'Invalid wallet address format' : undefined };
    
    default:
      return { valid: false, error: 'Invalid contact method' };
  }
}

async function processCertificateDelivery(certificate: any, deliveryOptions: any): Promise<void> {
  if (deliveryOptions?.scheduleDate) {
    // Schedule delivery for later
    await certificateService.scheduleDelivery(certificate.id, deliveryOptions.scheduleDate);
  } else {
    // Immediate delivery
    await certificateService.deliverCertificate(certificate.id, {
      priority: deliveryOptions?.priority || 'standard',
      notifyRecipient: deliveryOptions?.notifyRecipient !== false
    });
  }
}

function getCertificateNextSteps(status: string, contactMethod: string): string[] {
  const baseSteps = [
    'Certificate has been created successfully',
    `Delivery will be sent via ${contactMethod}`
  ];

  switch (status) {
    case 'pending':
      return [...baseSteps, 'Processing for delivery', 'Recipient will be notified when ready'];
    case 'issued':
      return [...baseSteps, 'Certificate is ready', 'Delivery notification sent'];
    case 'delivered':
      return [...baseSteps, 'Certificate delivered successfully', 'Recipient can now access certificate'];
    default:
      return baseSteps;
  }
}

function calculateBatchDuration(recipientCount: number, batchOptions: any): number {
  const baseTimePerCert = 30; // seconds
  const delay = batchOptions?.delayBetweenCerts || 1;
  const concurrent = batchOptions?.maxConcurrent || 5;
  
  const totalProcessingTime = (recipientCount / concurrent) * baseTimePerCert;
  const totalDelayTime = recipientCount * delay;
  
  return Math.ceil(totalProcessingTime + totalDelayTime);
}

function determineBatchPriority(plan: string): 'low' | 'normal' | 'high' {
  switch (plan) {
    case 'enterprise': return 'high';
    case 'premium': return 'normal';
    default: return 'low';
  }
}

function generateCertificateInsights(analytics: any): string[] {
  const insights: string[] = [];
  
  if (analytics.successRate > 0.95) {
    insights.push('Excellent certificate delivery success rate');
  }
  
  if (analytics.averageDeliveryTime < 300) { // 5 minutes
    insights.push('Fast certificate delivery times');
  }
  
  if (analytics.growthRate > 0.2) {
    insights.push('Certificate issuance is growing rapidly');
  }
  
  return insights;
}

function generateCertificateRecommendations(analytics: any, plan: string): string[] {
  const recommendations: string[] = [];
  
  if (analytics.failureRate > 0.1) {
    recommendations.push('Review and improve certificate delivery methods');
  }
  
  if (plan === 'foundation' && analytics.monthlyCount > 30) {
    recommendations.push('Consider upgrading for higher certificate limits');
  }
  
  if (analytics.emailDeliveryRate < analytics.smsDeliveryRate) {
    recommendations.push('Consider promoting SMS delivery for better success rates');
  }
  
  return recommendations;
}

