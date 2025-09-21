// src/controllers/brandAccount.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { getServices } from '../services/container.service';
import { clearTenantCache } from '../middleware/tenant.middleware';

// Enhanced request interfaces
interface BrandAccountRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    profilePictureUrl?: string;
    description?: string;
    industry?: string;
    contactEmail?: string;
    socialUrls?: string[];
    walletAddress?: string;
    headquarters?: {
      country?: string;
      city?: string;
      address?: string;
      timezone?: string;
    };
    businessInformation?: {
      establishedYear?: number;
      employeeCount?: string;
      annualRevenue?: string;
      businessLicense?: string;
      certifications?: string[];
    };
    communicationPreferences?: {
      preferredMethod?: string;
      responseTime?: string;
      languages?: string[];
    };
    marketingPreferences?: {
      allowEmails?: boolean;
      allowSms?: boolean;
      allowPushNotifications?: boolean;
    };
  };
}

interface VerificationRequest extends UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  body: {
    businessLicense?: string;
    taxDocument?: string;
    proofOfAddress?: string;
    additionalDocuments?: string[];
    verificationNotes?: string;
  };
}

/**
 * GET /api/brand/account/profile
 * Get comprehensive brand profile with enhanced metadata
 */
export async function getBrandProfile(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get comprehensive brand profile
    const { brandAccount: brandAccountService } = getServices();
    const profile = await brandAccountService.getComprehensiveBrandAccount(businessId);
    
    // Get additional metadata based on plan
    const metadata = await brandAccountService.buildProfileMetadata(businessId, userPlan);

    // Track profile view
    trackManufacturerAction('view_brand_profile');

    res.json({
      profile: {
        ...profile,
        profileCompleteness: brandAccountService.calculateProfileCompleteness(profile),
        lastUpdated: profile.updatedAt,
        accountAge: brandAccountService.calculateAccountAge(profile.createdAt)
      },
      metadata,
      planInfo: {
        currentPlan: userPlan,
        features: brandAccountService.getPlanFeatures(userPlan),
        limitations: brandAccountService.getPlanLimitations(userPlan)
      },
      recommendations: brandAccountService.generateProfileRecommendations(profile, userPlan)
    });
  } catch (error) {
    logger.error('Get brand profile error:', error);
    next(error);
  }
}

/**
 * Upload brand profile picture
 * POST /api/brand/account/profile-picture
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'profilePicture' field
 * @returns { profilePictureUrl, uploadedAt }
 */
export async function uploadProfilePicture(
  req: UnifiedAuthRequest & TenantRequest & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    if (!businessId) {
      res.status(401).json({
        error: 'Business ID not found in request',
        code: 'MISSING_BUSINESS_ID'
      });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: 'No profile picture file provided',
        code: 'MISSING_FILE'
      });
      return;
    }

    // Validate file type and size
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        code: 'INVALID_FILE_TYPE'
      });
      return;
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxFileSize) {
      res.status(400).json({
        error: 'File size exceeds 5MB limit',
        code: 'FILE_TOO_LARGE'
      });
      return;
    }

    // Upload and update profile picture through service
    const { brandAccount: brandAccountService } = getServices();
    const result = await brandAccountService.uploadProfilePicture(businessId, req.file);

    // Track profile picture upload
    trackManufacturerAction('upload_brand_profile_picture');

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePictureUrl: result.profilePictureUrl,
        uploadedAt: result.uploadedAt,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        // Add S3 information if available
        ...(result.s3Key && {
          storage: {
            type: 's3',
            s3Key: result.s3Key,
            s3Bucket: result.s3Bucket,
            s3Region: result.s3Region
          }
        })
      }
    });
  } catch (error) {
    logger.error('Upload brand profile picture error:', error);
    next(error);
  }
}

/**
 * PUT /api/brand/account/profile
 * Update brand profile with comprehensive validation and features
 */
export async function updateBrandProfile(
  req: BrandAccountRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const updateData = req.validatedBody || req.body;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get service instance
    const { brandAccount: brandAccountService } = getServices();

    // Validate plan permissions for certain fields
    const restrictedFields = brandAccountService.validatePlanPermissions(updateData, userPlan);
    if (restrictedFields.length > 0) {
       res.status(403).json({
        error: 'Some fields require a higher plan',
        restrictedFields,
        currentPlan: userPlan,
        requiredPlan: 'premium',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Get current profile for comparison
    const currentProfile = await brandAccountService.getBrandAccount(businessId);
    
    // Process wallet address change if present
    if (updateData.walletAddress && updateData.walletAddress !== currentProfile.walletAddress) {
      await brandAccountService.handleWalletAddressChange(businessId, updateData.walletAddress, currentProfile.walletAddress);
    }

    // Update profile with enhanced tracking
    const updatedProfile = await brandAccountService.updateBrandAccount(businessId, {
      ...updateData,
      lastUpdatedBy: businessId,
      lastUpdateSource: 'profile_page',
      updateMetadata: {
        fieldsChanged: brandAccountService.getChangedFields(currentProfile, updateData),
        updateReason: 'manual_update',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // Clear tenant cache if critical fields changed
    const criticalFields = ['businessName', 'industry', 'walletAddress'];
    const criticalFieldsChanged = Object.keys(updateData).some(field => 
      criticalFields.includes(field)
    );
    
    if (criticalFieldsChanged) {
      clearTenantCache(businessId);
    }

    // Track profile update
    trackManufacturerAction('update_brand_profile');

    // Send notifications for significant changes
    await brandAccountService.handleSignificantProfileChanges(businessId, currentProfile, updateData);

    // Calculate new profile completeness
    const newCompleteness = brandAccountService.calculateProfileCompleteness(updatedProfile);
    const completenessImproved = newCompleteness > brandAccountService.calculateProfileCompleteness(currentProfile);

    res.json({
      success: true,
      profile: {
        ...updatedProfile,
        profileCompleteness: newCompleteness
      },
      changes: {
        fieldsUpdated: Object.keys(updateData),
        completenessImproved,
        newCompleteness,
        significantChanges: brandAccountService.getSignificantChanges(currentProfile, updateData)
      },
      message: 'Brand profile updated successfully',
      recommendations: completenessImproved ? 
        brandAccountService.generateImprovementRecommendations(updatedProfile) : 
        brandAccountService.generateProfileRecommendations(updatedProfile, userPlan)
    });
  } catch (error) {
    logger.error('Update brand profile error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/account/verification
 * Submit brand verification documents with comprehensive processing
 */
export async function submitVerification(
  req: VerificationRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const verificationData = req.validatedBody || req.body;
    const userPlan = req.tenant?.plan || 'foundation';

    // Check if verification is already in progress
    const { brandAccount: brandAccountService } = getServices();
    const currentStatus = await brandAccountService.getVerificationStatus(businessId);
    if (currentStatus.status === 'pending') {
       res.status(400).json({
        error: 'Verification already in progress',
        currentStatus,
        code: 'VERIFICATION_IN_PROGRESS'
      })
      return;
    }

    // Validate required documents based on plan
    const requiredDocs = brandAccountService.getRequiredVerificationDocs(userPlan);
    const missingDocs = requiredDocs.filter(doc => !verificationData[doc]);
    
    if (missingDocs.length > 0) {
       res.status(400).json({
        error: 'Missing required verification documents',
        missingDocuments: missingDocs,
        requiredDocuments: requiredDocs,
        code: 'MISSING_DOCUMENTS'
      })
      return;
    }

    // Submit verification with enhanced tracking
    const verification = await brandAccountService.submitVerification(businessId, {
      ...verificationData,
      submittedAt: new Date(),
      submissionSource: 'brand_account',
      planLevel: userPlan,
      submissionMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        documentCount: Object.keys(verificationData).filter(key => 
          key !== 'verificationNotes'
        ).length
      }
    });

    // Track verification submission
    trackManufacturerAction('submit_brand_verification');

    // Send confirmation email
    const { notifications: notificationsService } = getServices();
    await notificationsService.sendVerificationSubmissionConfirmation(businessId, verification);

    // Log verification submission for admin review
    logger.info('Brand verification submitted: ${businessId} - ${verification.id}');

    res.status(201).json({
      success: true,
      verification: {
        id: verification.id,
        status: verification.status,
        submittedAt: verification.submittedAt,
        estimatedReviewTime: '3-5 business days'
      },
      nextSteps: [
        'Our team will review your documents within 3-5 business days',
        'You will receive an email notification once review is complete',
        'Verified status will unlock additional platform features'
      ],
      message: 'Verification documents submitted successfully'
    });
  } catch (error) {
    logger.error('Brand verification submission error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/account/verification/status
 * Get current verification status with detailed information
 */
export async function getVerificationStatus(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Get comprehensive verification status
    const { brandAccount: brandAccountService } = getServices();
    const status = await brandAccountService.getDetailedVerificationStatus(businessId);
    
    // Get verification history
    const history = await brandAccountService.getVerificationHistory(businessId);

    res.json({
      currentStatus: status,
      history,
      benefits: getVerificationBenefits(),
      requirements: getVerificationRequirements(req.tenant?.plan || 'foundation')
    });
  } catch (error) {
    logger.error('Get verification status error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/account/deactivate
 * Deactivate brand account with feedback collection
 */
export async function deactivateAccount(
  req: BrandAccountRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { reason, feedback, deleteData = false, confirmPassword } = req.validatedBody || req.body;

    // Verify password for security
    const { brandAccount: brandAccountService } = getServices();
    const passwordValid = await brandAccountService.verifyPassword(businessId, confirmPassword);
    if (!passwordValid) {
       res.status(401).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      })
      return;
    }

    // Check for active subscriptions
    const { billing: billingService } = getServices();
    const activeBilling = await billingService.getBillingInfo(businessId).catch(() => null);
    if (activeBilling && activeBilling.subscriptionStatus === 'active') {
       res.status(400).json({
        error: 'Please cancel your subscription before deactivating account',
        subscriptionInfo: activeBilling,
        code: 'ACTIVE_SUBSCRIPTION'
      })
      return;
    }

    // Process account deactivation
    const deactivation = await brandAccountService.deactivateAccount(businessId, {
      reason,
      feedback,
      deleteData,
      deactivatedBy: businessId,
      deactivationSource: 'self_service'
    });

    // Track account deactivation
    trackManufacturerAction('deactivate_brand_account');

    // Send deactivation confirmation
    const { notifications: notificationsService } = getServices();
    await notificationsService.sendAccountDeactivationConfirmation(businessId, deactivation);

    // Log account deactivation
    logger.info('Brand account deactivated: ${businessId} - Reason: ${reason}');

    res.json({
      success: true,
      deactivation: {
        id: deactivation.id,
        deactivatedAt: deactivation.deactivatedAt,
        reactivationPossible: !deleteData,
        dataRetentionPeriod: deleteData ? '30 days' : '1 year'
      },
      message: 'Account deactivated successfully',
      support: {
        email: 'support@yourplatform.com',
        reactivationProcess: 'Contact support to reactivate your account'
      }
    });
  } catch (error) {
    logger.error('Account deactivation error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/account/analytics
 * Get brand account analytics and insights
 */
export async function getAccountAnalytics(
  req: UnifiedAuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';
    const { timeframe = '30d' } = req.query;

    // Check plan permissions for analytics
    if (!['growth', 'premium', 'enterprise'].includes(userPlan)) {
       res.status(403).json({
        error: 'Account analytics require Growth plan or higher',
        currentPlan: userPlan,
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Get account analytics
    const { brandAccount: brandAccountService } = getServices();
    const analytics = await brandAccountService.getAccountAnalytics(businessId, {
      timeframe: timeframe as string,
      includeEngagement: true,
      includeConversions: ['premium', 'enterprise'].includes(userPlan),
      includeAdvancedMetrics: userPlan === 'enterprise'
    });

    // Get profile performance metrics
    const profileMetrics = await brandAccountService.getProfilePerformance(businessId);

    res.json({
      timeframe,
      analytics: {
        ...analytics,
        profilePerformance: profileMetrics
      },
      insights: generateAccountInsights(analytics, profileMetrics),
      recommendations: generateAnalyticsRecommendations(analytics, userPlan)
    });
  } catch (error) {
    logger.error('Account analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/account/export
 * Export brand account data in various formats
 */
export async function exportAccountData(
  req: UnifiedAuthRequest & TenantRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const { format = 'json', includeAnalytics = false } = req.validatedBody || req.body;
    const userPlan = req.tenant?.plan || 'foundation';

    // Validate export permissions
    if (format === 'pdf' && !['premium', 'enterprise'].includes(userPlan)) {
      res.status(403).json({
        error: 'PDF export requires Premium plan or higher',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Generate export data
    const { brandAccount: brandAccountService } = getServices();
    const exportData = await brandAccountService.exportAccountData(businessId, {
      format,
      includeAnalytics: includeAnalytics && ['growth', 'premium', 'enterprise'].includes(userPlan),
      includeHistory: ['premium', 'enterprise'].includes(userPlan),
      anonymize: false
    });

    // Track data export
    trackManufacturerAction('export_account_data');

    // Set appropriate headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `brand_account_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', getContentType(format));

    if (format === 'json') {
      res.json(exportData);
    } else {
      res.send(exportData);
    }
  } catch (error) {
    logger.error('Account data export error:', error);
    next(error);
  }
}

// Helper functions moved to BrandAccountService

function getVerificationBenefits(): string[] {
  return [
    'Verified badge on profile',
    'Higher trust score with partners',
    'Access to premium features',
    'Priority customer support',
    'Enhanced marketplace visibility'
  ];
}

function getVerificationRequirements(plan: string): any {
  const { brandAccount: brandAccountService } = getServices();
  return {
    requiredDocuments: brandAccountService.getRequiredVerificationDocs(plan),
    reviewTime: '3-5 business days',
    criteria: [
      'Valid business registration',
      'Accurate business information',
      'Professional documentation quality'
    ]
  };
}

function generateAccountInsights(analytics: any, profileMetrics: any): string[] {
  const insights: string[] = [];
  
  if (analytics.engagement?.rate > 0.8) {
    insights.push('Your profile has excellent engagement rates');
  }
  
  if (profileMetrics.views > 100) {
    insights.push('Your profile is getting good visibility');
  }
  
  if (analytics.conversions?.rate < 0.1) {
    insights.push('Consider optimizing your profile for better conversion');
  }
  
  return insights;
}

function generateAnalyticsRecommendations(analytics: any, plan: string): string[] {
  const recommendations: string[] = [];
  
  if (analytics.engagement?.rate < 0.5) {
    recommendations.push('Improve profile content to increase engagement');
  }
  
  if (plan === 'foundation') {
    recommendations.push('Upgrade to Growth plan for detailed analytics');
  }
  
  return recommendations;
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'pdf': return 'application/pdf';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

