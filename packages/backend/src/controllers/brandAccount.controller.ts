// src/controllers/brandAccount.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { BrandAccountService } from '../services/business/brandAccount.service';
import { BillingService } from '../services/external/billing.service';
import { NotificationsService } from '../services/external/notifications.service';
import { AnalyticsBusinessService } from '../services/business/analytics.service';
import { clearTenantCache } from '../middleware/tenant.middleware';

// Enhanced request interfaces
interface BrandAccountRequest extends AuthRequest, TenantRequest, ValidatedRequest {
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

interface VerificationRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  body: {
    businessLicense?: string;
    taxDocument?: string;
    proofOfAddress?: string;
    additionalDocuments?: string[];
    verificationNotes?: string;
  };
}

// Initialize services
const brandAccountService = new BrandAccountService();
const billingService = new BillingService();
const notificationsService = new NotificationsService();
const analyticsService = new AnalyticsBusinessService();

/**
 * GET /api/brand/account/profile
 * Get comprehensive brand profile with enhanced metadata
 */
export async function getBrandProfile(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;
    const userPlan = req.tenant?.plan || 'foundation';

    // Get comprehensive brand profile
    const profile = await brandAccountService.getComprehensiveBrandAccount(businessId);
    
    // Get additional metadata based on plan
    const metadata = await buildProfileMetadata(businessId, userPlan);

    // Track profile view
    trackManufacturerAction('view_brand_profile');

    res.json({
      profile: {
        ...profile,
        profileCompleteness: calculateProfileCompleteness(profile),
        lastUpdated: profile.updatedAt,
        accountAge: calculateAccountAge(profile.createdAt)
      },
      metadata,
      planInfo: {
        currentPlan: userPlan,
        features: getPlanFeatures(userPlan),
        limitations: getPlanLimitations(userPlan)
      },
      recommendations: generateProfileRecommendations(profile, userPlan)
    });
  } catch (error) {
    console.error('Get brand profile error:', error);
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

    // Validate plan permissions for certain fields
    const restrictedFields = validatePlanPermissions(updateData, userPlan);
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
      await handleWalletAddressChange(businessId, updateData.walletAddress, currentProfile.walletAddress);
    }

    // Update profile with enhanced tracking
    const updatedProfile = await brandAccountService.updateBrandAccount(businessId, {
      ...updateData,
      lastUpdatedBy: businessId,
      lastUpdateSource: 'profile_page',
      updateMetadata: {
        fieldsChanged: getChangedFields(currentProfile, updateData),
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
    await handleSignificantProfileChanges(businessId, currentProfile, updateData);

    // Calculate new profile completeness
    const newCompleteness = calculateProfileCompleteness(updatedProfile);
    const completenessImproved = newCompleteness > calculateProfileCompleteness(currentProfile);

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
        significantChanges: getSignificantChanges(currentProfile, updateData)
      },
      message: 'Brand profile updated successfully',
      recommendations: completenessImproved ? 
        generateImprovementRecommendations(updatedProfile) : 
        generateProfileRecommendations(updatedProfile, userPlan)
    });
  } catch (error) {
    console.error('Update brand profile error:', error);
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
    const requiredDocs = getRequiredVerificationDocs(userPlan);
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
    await notificationsService.sendVerificationSubmissionConfirmation(businessId, verification);

    // Log verification submission for admin review
    console.log(`Brand verification submitted: ${businessId} - ${verification.id}`);

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
    console.error('Brand verification submission error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/account/verification/status
 * Get current verification status with detailed information
 */
export async function getVerificationStatus(
  req: AuthRequest & TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const businessId = req.userId!;

    // Get comprehensive verification status
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
    console.error('Get verification status error:', error);
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
    const passwordValid = await brandAccountService.verifyPassword(businessId, confirmPassword);
    if (!passwordValid) {
       res.status(401).json({
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      })
      return;
    }

    // Check for active subscriptions
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
    await notificationsService.sendAccountDeactivationConfirmation(businessId, deactivation);

    // Log account deactivation
    console.log(`Brand account deactivated: ${businessId} - Reason: ${reason}`);

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
    console.error('Account deactivation error:', error);
    next(error);
  }
}

/**
 * GET /api/brand/account/analytics
 * Get brand account analytics and insights
 */
export async function getAccountAnalytics(
  req: AuthRequest & TenantRequest,
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
    console.error('Account analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/brand/account/export
 * Export brand account data in various formats
 */
export async function exportAccountData(
  req: AuthRequest & TenantRequest & ValidatedRequest,
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
    console.error('Account data export error:', error);
    next(error);
  }
}

// Helper functions
async function buildProfileMetadata(businessId: string, plan: string): Promise<any> {
  const metadata: any = {
    accountCreated: await brandAccountService.getAccountCreationDate(businessId),
    lastLogin: await brandAccountService.getLastLogin(businessId),
    planInfo: {
      currentPlan: plan,
      planFeatures: getPlanFeatures(plan)
    }
  };

  // Add advanced metadata for higher plans
  if (['premium', 'enterprise'].includes(plan)) {
    try {
      // Option 1: Use brandAccountService instead (which has getAccountSummary)
      metadata.analytics = await brandAccountService.getAccountSummary(businessId);
    } catch (error) {
      console.warn('Failed to get account analytics:', error);
      // Fallback to basic analytics info
      metadata.analytics = {
        profileCompleteness: 0,
        totalActiveDays: 0,
        lastAnalyticsUpdate: new Date()
      };
    }
  }

  if (plan === 'enterprise') {
    try {
      metadata.customization = await brandAccountService.getCustomizationOptions(businessId);
    } catch (error) {
      console.warn('Failed to get customization options:', error);
      metadata.customization = null;
    }
  }

  return metadata;
}

function calculateProfileCompleteness(profile: any): number {
  const requiredFields = [
    'businessName', 'email', 'industry', 'description', 'contactEmail'
  ];
  const optionalFields = [
    'profilePictureUrl', 'walletAddress', 'socialUrls', 'headquarters',
    'businessInformation', 'certifications'
  ];

  const completedRequired = requiredFields.filter(field => 
    profile[field] && profile[field] !== ''
  ).length;

  const completedOptional = optionalFields.filter(field => {
    const value = profile[field];
    return value && (
      typeof value === 'string' ? value !== '' :
      Array.isArray(value) ? value.length > 0 :
      typeof value === 'object' ? Object.keys(value).length > 0 :
      true
    );
  }).length;

  const requiredScore = (completedRequired / requiredFields.length) * 70;
  const optionalScore = (completedOptional / optionalFields.length) * 30;

  return Math.round(requiredScore + optionalScore);
}

function calculateAccountAge(createdAt: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years`;
}

function validatePlanPermissions(updateData: any, plan: string): string[] {
  const restrictedFields: string[] = [];
  
  // Premium+ only fields
  const premiumFields = ['customDomain', 'advancedAnalytics', 'prioritySupport'];
  if (!['premium', 'enterprise'].includes(plan)) {
    restrictedFields.push(...premiumFields.filter(field => updateData[field]));
  }

  // Enterprise only fields
  const enterpriseFields = ['whiteLabel', 'customBranding', 'dedicatedSupport'];
  if (plan !== 'enterprise') {
    restrictedFields.push(...enterpriseFields.filter(field => updateData[field]));
  }

  return restrictedFields;
}

async function handleWalletAddressChange(businessId: string, newWallet: string, oldWallet?: string): Promise<void> {
  try {
    // Verify wallet ownership if required
    if (newWallet) {
      // Remove the 'undefined' parameter - just call with 2 parameters
      const isValid = await brandAccountService.verifyWalletOwnership(businessId, newWallet);
      if (!isValid) {
        throw new Error('Wallet ownership verification failed');
      }
    }

    // Update billing discounts if wallet changed
    if (oldWallet !== newWallet) {
      await billingService.updateTokenDiscounts(businessId, newWallet);
    }
  } catch (error) {
    console.error('Error handling wallet address change:', error);
    throw error;
  }
}


function getChangedFields(current: any, update: any): string[] {
  return Object.keys(update).filter(key => {
    const currentValue = current[key];
    const updateValue = update[key];
    
    if (typeof updateValue === 'object' && updateValue !== null) {
      return JSON.stringify(currentValue) !== JSON.stringify(updateValue);
    }
    
    return currentValue !== updateValue;
  });
}

async function handleSignificantProfileChanges(businessId: string, current: any, update: any): Promise<void> {
  const significantFields = ['businessName', 'industry', 'contactEmail', 'walletAddress'];
  const significantChanges = significantFields.filter(field => 
    update[field] && current[field] !== update[field]
  );

  if (significantChanges.length > 0) {
    await notificationsService.sendProfileChangeNotification(businessId, significantChanges);
  }
}

function getSignificantChanges(current: any, update: any): string[] {
  const significantFields = ['businessName', 'industry', 'contactEmail', 'walletAddress'];
  return significantFields.filter(field => 
    update[field] && current[field] !== update[field]
  );
}

function generateProfileRecommendations(profile: any, plan: string): string[] {
  const recommendations: string[] = [];
  const completeness = calculateProfileCompleteness(profile);

  if (completeness < 80) {
    recommendations.push('Complete your profile to improve discoverability');
  }

  if (!profile.profilePictureUrl) {
    recommendations.push('Add a professional profile picture');
  }

  if (!profile.walletAddress && ['premium', 'enterprise'].includes(plan)) {
    recommendations.push('Connect your wallet to access Web3 features');
  }

  if (!profile.certifications || profile.certifications.length === 0) {
    recommendations.push('Add certifications to build trust with partners');
  }

  return recommendations;
}

function generateImprovementRecommendations(profile: any): string[] {
  return [
    'Great job improving your profile!',
    'Consider adding more certifications',
    'Keep your information up to date',
    'Engage with the manufacturer community'
  ];
}

function getPlanFeatures(plan: string): string[] {
  const features = {
    foundation: ['Basic Profile', 'Email Support'],
    growth: ['Enhanced Profile', 'Basic Analytics', 'Priority Support'],
    premium: ['Advanced Profile', 'Detailed Analytics', 'Custom Branding', 'Phone Support'],
    enterprise: ['Full Customization', 'Advanced Analytics', 'White-label', 'Dedicated Support']
  };
  return features[plan as keyof typeof features] || [];
}

function getPlanLimitations(plan: string): string[] {
  const limitations = {
    foundation: ['Limited customization', 'Basic analytics only'],
    growth: ['Standard customization', 'Limited integrations'],
    premium: ['Advanced features available'],
    enterprise: ['No limitations']
  };
  return limitations[plan as keyof typeof limitations] || [];
}

function getRequiredVerificationDocs(plan: string): string[] {
  const baseDocs = ['businessLicense'];
  
  if (['premium', 'enterprise'].includes(plan)) {
    return [...baseDocs, 'taxDocument', 'proofOfAddress'];
  }
  
  return baseDocs;
}

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
  return {
    requiredDocuments: getRequiredVerificationDocs(plan),
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

