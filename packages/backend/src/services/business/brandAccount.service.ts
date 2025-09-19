// src/services/business/brandAccount.service.ts
import { Business, IBusiness } from '../../models/business.model';
import { logger } from '../utils/logger';
import { ethers } from 'ethers';
import { TokenDiscountService } from '../external/tokenDiscount.service';
import { BrandSettings } from '../../models/brandSettings.model';
import { MediaService } from './media.service';

export interface ProfilePictureUploadResult {
  profilePictureUrl: string;
  uploadedAt: Date;
  filename: string;
  fileSize: number;
  s3Key?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export class BrandAccountService {
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
  }
  
  async getBrandAccount(businessId: string): Promise<IBusiness> {
    const biz = await Business.findById(businessId).select(
      'firstName lastName businessName profilePictureUrl description industry contactEmail socialUrls'
    );
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }
  
  async updateBrandAccount(businessId: string, data: Partial<IBusiness>): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      {
        profilePictureUrl: data.profilePictureUrl,
        description: data.description,
        industry: data.industry,
        contactEmail: data.contactEmail,
        socialUrls: data.socialUrls
      },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }

  async getBrandBasicInfo(businessId: string): Promise<Pick<IBusiness, 'businessName' | 'profilePictureUrl'>> {
    const biz = await Business.findById(businessId).select('businessName profilePictureUrl');
    if (!biz) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return biz;
  }

  /**
   * Upload brand profile picture
   */
  async uploadProfilePicture(businessId: string, file: Express.Multer.File): Promise<ProfilePictureUploadResult> {
    try {
      if (!businessId?.trim()) {
        throw { statusCode: 400, message: 'Business ID is required' };
      }

      if (!file) {
        throw { statusCode: 400, message: 'Profile picture file is required' };
      }

      // Validate file type and size
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw { statusCode: 400, message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' };
      }

      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxFileSize) {
        throw { statusCode: 400, message: 'File size exceeds 5MB limit' };
      }

      // Upload through media service
      const media = await this.mediaService.saveMedia(file, businessId, {
        category: 'profile',
        description: 'Brand profile picture',
        isPublic: true
      });

      // Update brand profile with new picture URL
      await Business.findByIdAndUpdate(businessId, {
        profilePictureUrl: media.url,
        updatedAt: new Date()
      });

      // Also update brand settings logo to keep them in sync
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { logoUrl: media.url },
        { upsert: true }
      );

      return {
        profilePictureUrl: media.url,
        uploadedAt: media.createdAt,
        filename: media.filename,
        fileSize: file.size,
        // Add S3 information if available
        s3Key: media.s3Key,
        s3Bucket: media.s3Bucket,
        s3Region: media.s3Region
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      throw { statusCode: 500, message: `Failed to upload profile picture: ${error.message}` };
    }
  }

  async updateContactInfo(businessId: string, contactEmail: string): Promise<IBusiness> {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      { contactEmail },
      { new: true }
    );
    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }
    return updated;
  }

  async getComprehensiveBrandAccount(businessId: string): Promise<any> {
  try {
    const [business, brandSettings, billing, analytics] = await Promise.all([
      Business.findById(businessId).select('-password'),
      BrandSettings.findOne({ business: businessId }),
      this.getBillingInfo(businessId),
      this.getAccountAnalytics(businessId)
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      business: business.toObject(),
      brandSettings: brandSettings?.toObject() || null,
      billing: billing || null,
      analytics: analytics || null,
      verification: await this.getVerificationStatus(businessId),
      profileCompleteness: business.getProfileCompleteness?.() || 0,
      lastActivity: business.lastLoginAt || business.updatedAt,
      accountAge: this.getAccountAge(business.createdAt),
      features: this.getAvailableFeatures(billing?.plan || 'foundation')
    };
  } catch (error) {
    logger.error('Error getting comprehensive brand account:', error);
    throw error;
  }
}

async getVerificationStatus(businessId: string): Promise<any> {
  try {
    const business = await Business.findById(businessId).select('isEmailVerified isPhoneVerified');
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      email: {
        verified: business.isEmailVerified,
        verifiedAt: business.emailVerifiedAt || null
      },
      phone: {
        verified: business.isPhoneVerified || false,
        verifiedAt: business.phoneVerifiedAt || null
      },
      business: {
        verified: brandSettings?.businessVerified || false,
        verifiedAt: brandSettings?.businessVerifiedAt || null,
        documents: brandSettings?.verificationDocuments || []
      },
      wallet: {
        verified: brandSettings?.web3Settings?.walletVerified || false,
        verifiedAt: brandSettings?.web3Settings?.walletVerifiedAt || null,
        address: brandSettings?.web3Settings?.certificateWallet || null
      },
      overallStatus: this.calculateOverallVerificationStatus(business, brandSettings)
    };
  } catch (error) {
    logger.error('Error getting verification status:', error);
    throw error;
  }
}

async submitVerification(businessId: string, verificationData: any): Promise<any> {
  try {
    const { type, documents, additionalInfo } = verificationData;

    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const verification = {
      type,
      status: 'pending',
      submittedAt: new Date(),
      documents: documents || [],
      additionalInfo: additionalInfo || {},
      businessId
    };

    // Store verification request (you might want to create a Verification model)
    const verificationRecord = await this.createVerificationRecord(verification);

    // Update business/brand settings based on verification type
    if (type === 'business') {
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            businessVerificationStatus: 'pending',
            businessVerificationSubmittedAt: new Date(),
            verificationDocuments: documents
          }
        },
        { upsert: true }
      );
    }

    // Send notification to admins about new verification request
    await this.notifyAdminsOfVerificationSubmission(businessId, type);

    return {
      verificationId: verificationRecord.id,
      status: 'pending',
      submittedAt: verification.submittedAt,
      estimatedReviewTime: '3-5 business days',
      nextSteps: this.getVerificationNextSteps(type)
    };
  } catch (error) {
    logger.error('Error submitting verification:', error);
    throw error;
  }
}

async getDetailedVerificationStatus(businessId: string): Promise<any> {
  try {
    const baseStatus = await this.getVerificationStatus(businessId);
    const verificationHistory = await this.getVerificationHistory(businessId);
    const pendingVerifications = await this.getPendingVerifications(businessId);

    return {
      ...baseStatus,
      history: verificationHistory,
      pending: pendingVerifications,
      requirements: this.getVerificationRequirements(),
      tips: this.getVerificationTips()
    };
  } catch (error) {
    logger.error('Error getting detailed verification status:', error);
    throw error;
  }
}

async getVerificationHistory(businessId: string): Promise<any[]> {
  try {
    // This would query a VerificationHistory model if you have one
    // For now, return a basic structure
    const business = await Business.findById(businessId);
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    const history = [];

    if (business?.isEmailVerified) {
      history.push({
        type: 'email',
        status: 'verified',
        completedAt: business.emailVerifiedAt || business.createdAt,
        method: 'email_confirmation'
      });
    }

    if (business?.isPhoneVerified) {
      history.push({
        type: 'phone',
        status: 'verified',
        completedAt: business.phoneVerifiedAt || business.createdAt,
        method: 'sms_verification'
      });
    }

    if (brandSettings?.businessVerified) {
      history.push({
        type: 'business',
        status: 'verified',
        completedAt: brandSettings.businessVerifiedAt,
        method: 'document_review'
      });
    }

    return history.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch (error) {
    logger.error('Error getting verification history:', error);
    return [];
  }
}

async verifyPassword(businessId: string, password: string): Promise<boolean> {
  try {
    const business = await Business.findById(businessId).select('+password');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const isValid = await business.comparePassword(password);
    
    // Log password verification attempt
    logger.info('Password verification attempt for business ${businessId}: ${isValid ? ', success' : 'failed'}`);
    
    return isValid;
  } catch (error) {
    logger.error('Error verifying password:', error);
    throw error;
  }
}

/**
 * Batch update token discounts for multiple businesses
 * Useful for scheduled tasks or bulk operations
 */
async batchUpdateTokenDiscounts(businessIds: string[]): Promise<any[]> {
  const results = [];
  
  for (const businessId of businessIds) {
    try {
      const result = await this.updateTokenDiscounts(businessId);
      results.push({ businessId, success: true, ...result });
    } catch (error) {
      logger.error('Failed to update token discounts for business ${businessId}:', error);
      results.push({ 
        businessId, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return results;
}

/**
 * Get wallet verification status with detailed information
 */
async getWalletVerificationStatus(businessId: string): Promise<any> {
  try {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    if (!brandSettings?.web3Settings) {
      return {
        hasWallet: false,
        verified: false,
        message: 'No Web3 settings found'
      };
    }
    
    const web3Settings = brandSettings.web3Settings;
    
    return {
      hasWallet: !!web3Settings.certificateWallet,
      walletAddress: web3Settings.certificateWallet || null,
      verified: web3Settings.walletVerified || false,
      verifiedAt: web3Settings.walletVerifiedAt || null,
      lastDiscountCheck: web3Settings.lastDiscountCheck || null,
      discountCount: web3Settings.tokenDiscounts?.length || 0,
      message: web3Settings.walletVerified ? 'Wallet verified' : 'Wallet not verified'
    };
  } catch (error) {
    logger.error('Error getting wallet verification status:', error);
    throw { 
      statusCode: 500, 
      message: 'Failed to get wallet verification status' 
    };
  }
}

/**
 * Update token discounts for a business account
 * This method should be called when wallet address changes or periodically to refresh discounts
 */
async updateTokenDiscounts(businessId: string, walletAddress?: string): Promise<any> {
  try {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    
    // Use provided wallet address or get from brand settings
    const targetWallet = walletAddress || brandSettings?.web3Settings?.certificateWallet;
    
    if (!targetWallet || !brandSettings?.web3Settings?.walletVerified) {
      return { 
        hasDiscounts: false, 
        message: 'No verified wallet found',
        walletAddress: targetWallet || null
      };
    }

    // Check for token-based discounts
    const tokenService = new TokenDiscountService();
    const discounts = await tokenService.getAvailableDiscounts(targetWallet);

    // Update brand settings with current discounts
    await BrandSettings.updateOne(
      { business: businessId },
      {
        $set: {
          'web3Settings.tokenDiscounts': discounts,
          'web3Settings.discountsUpdatedAt': new Date(),
          'web3Settings.lastDiscountCheck': new Date()
        }
      }
    );

    // Log discount update
    logger.info('Token discounts updated for business ${businessId}: ${discounts.length} discounts found');

    return {
      hasDiscounts: discounts.length > 0,
      discounts,
      walletAddress: targetWallet,
      lastUpdated: new Date(),
      discountCount: discounts.length
    };
  } catch (error) {
    logger.error('Error updating token discounts:', error);
    throw { 
      statusCode: 500, 
      message: 'Failed to update token discounts',
      originalError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get the last login date for a business account
 * Returns null if never logged in or if business not found
 */
async getLastLogin(businessId: string): Promise<Date | null> {
  try {
    const business = await Business.findById(businessId).select('lastLoginAt');
    
    if (!business) {
      throw { 
        statusCode: 404, 
        message: 'Business not found' 
      };
    }

    return business.lastLoginAt || null;
  } catch (error) {
    logger.error('Error getting last login:', error);
    
    // If it's our custom error, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    
    // For other errors, return null instead of throwing
    logger.warn('Failed to get last login for business ${businessId}:', error);
    return null;
  }
}

async deactivateAccount(
  businessId: string, 
  deactivationData: {
    reason?: string;
    feedback?: string;
    deleteData?: boolean;
    deactivatedBy: string;
    deactivationSource: string;
  }
): Promise<{
  id: string;
  deactivatedAt: Date;
  reactivationPossible: boolean;
  dataRetentionPeriod?: number;
  reason?: string;
  feedback?: string;
}> {
  try {
    const business = await Business.findById(businessId);
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const deactivationId = `DEACT_${Date.now()}_${businessId.slice(-6)}`;
    const deactivatedAt = new Date();

    // Update business status with comprehensive deactivation data
    await Business.updateOne(
      { _id: businessId },
      {
        $set: {
          isActive: false,
          deactivatedAt,
          deactivationReason: deactivationData.reason || 'user_requested',
          deactivationFeedback: deactivationData.feedback,
          deactivatedBy: deactivationData.deactivatedBy,
          deactivationSource: deactivationData.deactivationSource,
          status: 'deactivated',
          // Store deactivation metadata
          deactivationMetadata: {
            id: deactivationId,
            deleteDataRequested: deactivationData.deleteData || false,
            timestamp: deactivatedAt,
            ipAddress: null // Could be passed in deactivationData if needed
          }
        }
      }
    );

    // Cancel any active subscriptions
    await this.cancelActiveSubscriptions(businessId);

    // Archive brand settings instead of deleting if data retention is requested
    if (deactivationData.deleteData) {
      // Schedule data deletion
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            isActive: false,
            scheduledForDeletion: true,
            deletionScheduledAt: deactivatedAt,
            archivedAt: deactivatedAt
          }
        }
      );
    } else {
      // Just archive for potential reactivation
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            isActive: false,
            archivedAt: deactivatedAt
          }
        }
      );
    }

    logger.info('Account deactivated: ${businessId}', {
      reason: deactivationData.reason,
      deleteData: deactivationData.deleteData,
      source: deactivationData.deactivationSource
    });

    return {
      id: deactivationId,
      deactivatedAt,
      reactivationPossible: !deactivationData.deleteData,
      dataRetentionPeriod: deactivationData.deleteData ? 0 : 30, // days
      reason: deactivationData.reason,
      feedback: deactivationData.feedback
    };
  } catch (error) {
    logger.error('Error deactivating account:', error);
    throw error;
  }
}

async getAccountAnalytics(
  businessId: string, 
  options?: {
    timeframe?: string;
    includeEngagement?: boolean;
    includeConversions?: boolean;
    includeAdvancedMetrics?: boolean;
  }
): Promise<any> {
  try {
    // Parse timeframe - default to 30 days
    const timeframe = options?.timeframe || '30d';
    let daysAgo = 30;
    
    // Parse timeframe string (30d, 7d, 90d, etc.)
    const timeframeMatch = timeframe.match(/^(\d+)([dDwWmMyY])$/);
    if (timeframeMatch) {
      const [, amount, unit] = timeframeMatch;
      const numAmount = parseInt(amount);
      
      switch (unit.toLowerCase()) {
        case 'd':
          daysAgo = numAmount;
          break;
        case 'w':
          daysAgo = numAmount * 7;
          break;
        case 'm':
          daysAgo = numAmount * 30;
          break;
        case 'y':
          daysAgo = numAmount * 365;
          break;
        default:
          daysAgo = 30;
      }
    }

    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Use 'any' type for analytics object to allow dynamic properties
    const analytics: any = {
      apiUsage: await this.getApiUsage(businessId, startDate),
      certificateUsage: await this.getCertificateUsage(businessId, startDate),
      votingActivity: await this.getVotingActivity(businessId, startDate),
      loginActivity: await this.getLoginActivity(businessId, startDate),
      profileViews: await this.getProfileViews(businessId, startDate)
    };

    // Add engagement metrics if requested
    if (options?.includeEngagement) {
      analytics.engagement = await this.getEngagementMetrics(businessId, startDate);
    }

    // Add conversion metrics if requested
    if (options?.includeConversions) {
      analytics.conversions = await this.getConversionMetrics(businessId, startDate);
    }

    // Add advanced metrics if requested
    if (options?.includeAdvancedMetrics) {
      analytics.advanced = await this.getAdvancedMetrics(businessId, startDate);
    }

    return {
      ...analytics,
      period: {
        start: startDate,
        end: new Date(),
        timeframe
      },
      summary: {
        totalActiveDays: analytics.loginActivity.activeDays || 0,
        mostActiveFeature: this.getMostActiveFeature(analytics),
        growthTrend: this.calculateGrowthTrend(analytics)
      },
      options: {
        includeEngagement: options?.includeEngagement || false,
        includeConversions: options?.includeConversions || false,
        includeAdvancedMetrics: options?.includeAdvancedMetrics || false
      }
    };
  } catch (error) {
    logger.error('Error getting account analytics:', error);
    return {
      error: 'Failed to retrieve analytics',
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
        timeframe: options?.timeframe || '30d'
      }
    };
  }
}

async getProfilePerformance(businessId: string): Promise<any> {
  try {
    const business = await Business.findById(businessId);
    const brandSettings = await BrandSettings.findOne({ business: businessId });

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    const completeness = business.getProfileCompleteness?.() || 0;
    const performance = {
      completeness,
      score: this.calculateProfileScore(business, brandSettings),
      missingFields: this.getMissingProfileFields(business, brandSettings),
      recommendations: this.getProfileRecommendations(completeness),
      lastUpdated: business.updatedAt,
      visibility: this.calculateProfileVisibility(business, brandSettings)
    };

    return performance;
  } catch (error) {
    logger.error('Error getting profile performance:', error);
    throw error;
  }
}

async exportAccountData(
  businessId: string, 
  options?: {
    format?: string;
    includeAnalytics?: boolean;
    includeHistory?: boolean;
    anonymize?: boolean;
  }
): Promise<any> {
  try {
    const format = options?.format || 'json';
    const includeAnalytics = options?.includeAnalytics || false;
    const includeHistory = options?.includeHistory || false;
    const anonymize = options?.anonymize || false;

    // Get comprehensive data
    const comprehensive = await this.getComprehensiveBrandAccount(businessId);
    
    // Build export data based on options
    const exportData: any = {
      exportedAt: new Date(),
      format,
      businessId: anonymize ? 'REDACTED' : businessId,
      data: {
        business: anonymize ? this.anonymizeBusinessData(comprehensive.business) : comprehensive.business,
        brandSettings: comprehensive.brandSettings,
        verification: comprehensive.verification
      }
    };

    // Conditionally include analytics
    if (includeAnalytics && comprehensive.analytics) {
      exportData.data.analytics = comprehensive.analytics;
    }

    // Conditionally include history
    if (includeHistory) {
      exportData.data.history = await this.getAccountHistory(businessId);
    }

    // Add export metadata
    exportData.metadata = {
      exportOptions: {
        format,
        includeAnalytics,
        includeHistory,
        anonymize
      },
      dataScope: this.getDataScope(includeAnalytics, includeHistory),
      exportedBy: businessId,
      version: '2.0'
    };

    // Log export request
    logger.info('Data export requested for business ${businessId}', {
      format,
      includeAnalytics,
      includeHistory,
      anonymize
    });

    // Process based on format
    switch (format.toLowerCase()) {
      case 'csv':
        return this.convertToCSV(exportData);
      case 'pdf':
        return this.generatePDFReport(exportData);
      case 'xlsx':
        return this.convertToExcel(exportData);
      case 'xml':
        return this.convertToXML(exportData);
      default:
        return exportData; // Return JSON by default
    }
  } catch (error) {
    logger.error('Error exporting account data:', error);
    throw {
      statusCode: 500,
      message: 'Failed to export account data',
      originalError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async getAccountCreationDate(businessId: string): Promise<Date> {
  try {
    const business = await Business.findById(businessId).select('createdAt');
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }
    return business.createdAt;
  } catch (error) {
    logger.error('Error getting account creation date:', error);
    throw error;
  }
}


async getAccountSummary(businessId: string): Promise<any> {
  try {
    const [business, brandSettings, billing] = await Promise.all([
      Business.findById(businessId).select('-password'),
      BrandSettings.findOne({ business: businessId }),
      this.getBillingInfo(businessId)
    ]);

    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      id: businessId,
      businessName: business.businessName,
      email: business.email,
      plan: billing?.plan || 'foundation',
      status: business.isActive ? 'active' : 'inactive',
      verified: business.isEmailVerified,
      createdAt: business.createdAt,
      lastLoginAt: business.lastLoginAt,
      profileCompleteness: business.getProfileCompleteness?.() || 0,
      walletConnected: !!brandSettings?.web3Settings?.certificateWallet,
      industry: business.industry
    };
  } catch (error) {
    logger.error('Error getting account summary:', error);
    throw error;
  }
}

async getCustomizationOptions(businessId: string): Promise<any> {
  try {
    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const billing = await this.getBillingInfo(businessId);
    const plan = billing?.plan || 'foundation';

    const availableOptions = {
      themes: this.getAvailableThemes(plan),
      branding: this.getBrandingOptions(plan),
      features: this.getCustomizableFeatures(plan),
      integrations: this.getAvailableIntegrations(plan)
    };

    const currentSettings = {
      theme: brandSettings?.customization?.theme || 'default',
      primaryColor: brandSettings?.customization?.primaryColor || '#007bff',
      logo: brandSettings?.customization?.logoUrl || null,
      customDomain: brandSettings?.customization?.customDomain || null
    };

    return {
      available: availableOptions,
      current: currentSettings,
      plan,
      upgradeRequired: this.getUpgradeRequiredFeatures(plan)
    };
  } catch (error) {
    logger.error('Error getting customization options:', error);
    throw error;
  }
}

async verifyWalletOwnership(businessId: string, walletAddress: string, signature?: string): Promise<boolean> {
  try {
    // If no signature provided, check if wallet is already verified in settings
    if (!signature || signature === '') {
      const brandSettings = await BrandSettings.findOne({ business: businessId });
      return !!(brandSettings?.web3Settings?.walletVerified && 
                brandSettings?.web3Settings?.certificateWallet === walletAddress);
    }

    // If signature provided, verify it
    const message = `Verify wallet ownership for business: ${businessId}`;
    const isValid = await this.verifyWalletSignature(walletAddress, message, signature);

    if (isValid) {
      // Update brand settings with verified wallet
      await BrandSettings.updateOne(
        { business: businessId },
        {
          $set: {
            'web3Settings.certificateWallet': walletAddress,
            'web3Settings.walletVerified': true,
            'web3Settings.walletVerifiedAt': new Date(),
            'web3Settings.walletSignature': signature,
            'web3Settings.verificationMessage': message
          }
        },
        { upsert: true }
      );

      await this.updateTokenDiscounts(businessId, walletAddress);
      logger.info('Wallet verified for business ${businessId}: ${walletAddress}');
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying wallet ownership:', error);
    return false;
  }
}


private getAccountAge(createdAt: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) return `${diffDays} days`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
  return `${Math.floor(diffDays / 365)} years`;
}

private getAvailableFeatures(plan: string): string[] {
  const features = {
    foundation: ['basic_api', 'community_support'],
    growth: ['advanced_api', 'email_support', 'analytics'],
    premium: ['priority_support', 'custom_branding', 'advanced_analytics'],
    enterprise: ['dedicated_support', 'custom_integrations', 'white_label']
  };
  return features[plan as keyof typeof features] || features.foundation;
}

private calculateOverallVerificationStatus(business: any, brandSettings: any): string {
  const emailVerified = business.isEmailVerified;
  const businessVerified = brandSettings?.businessVerified || false;
  const walletVerified = brandSettings?.web3Settings?.walletVerified || false;

  if (emailVerified && businessVerified && walletVerified) return 'fully_verified';
  if (emailVerified && businessVerified) return 'business_verified';
  if (emailVerified) return 'email_verified';
  return 'unverified';
}

private async createVerificationRecord(verification: any): Promise<any> {
  // Implement verification record creation
  // You might want to create a Verification model for this
  return { id: `ver_${Date.now()}`, ...verification };
}

private async notifyAdminsOfVerificationSubmission(businessId: string, type: string): Promise<void> {
  logger.info('New ${type} verification submitted for business: ${businessId}');
}


private getVerificationNextSteps(type: string): string[] {
  const steps = {
    business: ['Wait for document review', 'Check email for updates', 'Respond to any requests for additional info'],
    identity: ['Provide government ID', 'Take verification selfie', 'Wait for review'],
    wallet: ['Sign verification message', 'Confirm wallet ownership']
  };
  return steps[type as keyof typeof steps] || ['Contact support for assistance'];
}

private async getPendingVerifications(businessId: string): Promise<any[]> {
  // Implement pending verifications lookup
  return [];
}

private getVerificationRequirements(): any {
  return {
    business: ['Business registration documents', 'Tax ID certificate', 'Proof of address'],
    identity: ['Government-issued ID', 'Recent photo', 'Proof of address'],
    wallet: ['Wallet signature', 'Token holdings (for discounts)']
  };
}

private getVerificationTips(): string[] {
  return [
    'Ensure all documents are clear and legible',
    'Use recent documents (within 3 months)',
    'Make sure your name matches across all documents',
    'Contact support if you need help with any step'
  ];
}

private async getBillingInfo(businessId: string): Promise<any> {
  // Implement billing info retrieval
  return null;
}

private async cancelActiveSubscriptions(businessId: string): Promise<void> {
  logger.info('Cancelling active subscriptions for business: ${businessId}');
}

private async sendDeactivationConfirmation(email: string, reason: string): Promise<void> {
  logger.info('Sending deactivation confirmation to: ${email}, reason: ${reason}');
}

private async getApiUsage(businessId: string, since: Date): Promise<any> {
  return { calls: 0, endpoints: [] };
}

private async getCertificateUsage(businessId: string, since: Date): Promise<any> {
  return { issued: 0, verified: 0 };
}

private async getVotingActivity(businessId: string, since: Date): Promise<any> {
  return { votes: 0, proposals: 0 };
}

private async getLoginActivity(businessId: string, since: Date): Promise<any> {
  return { activeDays: 0, totalSessions: 0 };
}

private async getProfileViews(businessId: string, since: Date): Promise<any> {
  return { views: 0, uniqueVisitors: 0 };
}

private getMostActiveFeature(analytics: any): string {
  return 'certificates'; // Implement logic to determine most used feature
}

private calculateGrowthTrend(analytics: any): string {
  return 'stable'; // Implement growth calculation
}

private calculateProfileScore(business: any, brandSettings: any): number {
  // Implement profile scoring logic
  return 85;
}

private getMissingProfileFields(business: any, brandSettings: any): string[] {
  const missing = [];
  if (!business.description) missing.push('description');
  if (!business.website) missing.push('website');
  if (!business.industry) missing.push('industry');
  return missing;
}

private getProfileRecommendations(completeness: number): string[] {
  if (completeness < 50) {
    return ['Add business description', 'Upload logo', 'Complete contact information'];
  }
  if (completeness < 80) {
    return ['Add social media links', 'Upload additional photos', 'Complete business verification'];
  }
  return ['Connect wallet for Web3 features', 'Enable API access'];
}

private calculateProfileVisibility(business: any, brandSettings: any): string {
  if (business.isEmailVerified && brandSettings?.businessVerified) return 'high';
  if (business.isEmailVerified) return 'medium';
  return 'low';
}

private convertToCSV(data: any): string {
  // Implement CSV conversion
  return 'CSV data here';
}

private generatePDFReport(data: any): Buffer {
  // Implement PDF generation
  return Buffer.from('PDF data');
}

private getAvailableThemes(plan: string): string[] {
  const themes = {
    foundation: ['default', 'light'],
    growth: ['default', 'light', 'dark'],
    premium: ['default', 'light', 'dark', 'corporate'],
    enterprise: ['default', 'light', 'dark', 'corporate', 'custom']
  };
  return themes[plan as keyof typeof themes] || themes.foundation;
}

private getBrandingOptions(plan: string): any {
  return {
    customLogo: ['premium', 'enterprise'].includes(plan),
    customColors: ['growth', 'premium', 'enterprise'].includes(plan),
    customDomain: plan === 'enterprise'
  };
}

private getCustomizableFeatures(plan: string): string[] {
  const features = {
    foundation: ['basic_settings'],
    growth: ['basic_settings', 'email_templates'],
    premium: ['basic_settings', 'email_templates', 'dashboard_layout'],
    enterprise: ['basic_settings', 'email_templates', 'dashboard_layout', 'api_responses']
  };
  return features[plan as keyof typeof features] || features.foundation;
}

private getAvailableIntegrations(plan: string): string[] {
  const integrations = {
    foundation: ['webhooks'],
    growth: ['webhooks', 'zapier'],
    premium: ['webhooks', 'zapier', 'slack'],
    enterprise: ['webhooks', 'zapier', 'slack', 'custom_api']
  };
  return integrations[plan as keyof typeof integrations] || integrations.foundation;
}

private getUpgradeRequiredFeatures(plan: string): string[] {
  if (plan === 'foundation') return ['Custom branding', 'Advanced analytics', 'Priority support'];
  if (plan === 'growth') return ['Custom domain', 'White label', 'Dedicated support'];
  if (plan === 'premium') return ['Custom integrations', 'White label'];
  return [];
}

/**
 * Wallet signature verification using ethers.js
 */
private async verifyWalletSignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
  try {
    const normalizedAddress = ethers.getAddress(walletAddress);
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    
    const isValid = normalizedAddress.toLowerCase() === recoveredAddress.toLowerCase();
    
    if (isValid) {
      logger.info('Signature verification successful for wallet: ${walletAddress}');
    } else {
      logger.warn('Signature verification failed - Expected: ${normalizedAddress}, Got: ${recoveredAddress}');
    }
    
    return isValid;
  } catch (error) {
    logger.error('Wallet signature verification error:', error);
    
    try {
      const isValidFormat = /^0x[a-fA-F0-9]{130}$/.test(signature);
      if (!isValidFormat) {
        logger.warn('Invalid signature format');
        return false;
      }
      
      if (process.env.NODE_ENV === 'development' && signature === '0xtest_signature') {
        logger.warn('Using test signature in development mode');
        return true;
      }
      
      return false;
    } catch (fallbackError) {
      logger.error('Signature verification fallback failed:', fallbackError);
      return false;
    }
  }
 }

 private async getEngagementMetrics(businessId: string, since: Date): Promise<any> {
  try {
    // Implement engagement tracking - this could include:
    // - User interactions with certificates
    // - Partner engagement
    // - Feature usage patterns
    return {
      totalInteractions: 0,
      uniqueUsers: 0,
      averageSessionTime: 0,
      bounceRate: 0,
      featureAdoption: {
        certificates: 0,
        voting: 0,
        partnerships: 0
      }
    };
  } catch (error) {
    logger.error('Error getting engagement metrics:', error);
    return {};
  }
}

private async getConversionMetrics(businessId: string, since: Date): Promise<any> {
  try {
    // Implement conversion tracking - this could include:
    // - Visitor to user conversion
    // - Free to paid conversion
    // - Feature utilization rates
    return {
      visitorToUser: 0,
      freeToPaid: 0,
      trialConversion: 0,
      featureConversions: {
        certificates: 0,
        voting: 0,
        partnerships: 0
      }
    };
  } catch (error) {
    logger.error('Error getting conversion metrics:', error);
    return {};
  }
}

private async getAdvancedMetrics(businessId: string, since: Date): Promise<any> {
  try {
    // Implement advanced analytics - this could include:
    // - Predictive analytics
    // - Cohort analysis
    // - Revenue attribution
    return {
      predictions: {
        nextMonthUsage: 0,
        churnRisk: 'low',
        growthTrend: 'stable'
      },
      cohortAnalysis: {},
      revenueAttribution: {},
      customMetrics: {}
    };
  } catch (error) {
    logger.error('Error getting advanced metrics:', error);
    return {};
  }
}

/**
 * Anonymize business data for privacy-compliant exports
 */
private anonymizeBusinessData(businessData: any): any {
  if (!businessData) return null;

  return {
    ...businessData,
    email: this.maskEmail(businessData.email),
    contactEmail: businessData.contactEmail ? this.maskEmail(businessData.contactEmail) : null,
    businessName: businessData.businessName ? 'Business_' + businessData._id.toString().slice(-6) : null,
    // Keep non-sensitive fields
    industry: businessData.industry,
    createdAt: businessData.createdAt,
    isEmailVerified: businessData.isEmailVerified,
    // Remove sensitive fields
    password: undefined,
    resetTokens: undefined,
    verificationCodes: undefined
  };
}

/**
 * Get account history for comprehensive exports
 */
private async getAccountHistory(businessId: string): Promise<any> {
  try {
    return {
      verificationHistory: await this.getVerificationHistory(businessId),
      loginHistory: await this.getLoginHistory(businessId),
      profileChanges: await this.getProfileChangeHistory(businessId),
      billingHistory: await this.getBillingHistory(businessId)
    };
  } catch (error) {
    logger.error('Error getting account history:', error);
    return {};
  }
}

/**
 * Get data scope description for export metadata
 */
private getDataScope(includeAnalytics: boolean, includeHistory: boolean): string {
  const scopes = ['profile', 'settings', 'verification'];
  
  if (includeAnalytics) scopes.push('analytics');
  if (includeHistory) scopes.push('history');
  
  return scopes.join(', ');
}

/**
 * Mask email for privacy
 */
private maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'REDACTED';
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 0)) + local.charAt(local.length - 1);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Convert export data to Excel format
 */
private convertToExcel(data: any): Buffer {
  try {
    // This is a placeholder - implement with a library like 'xlsx'
    // const XLSX = require('xlsx');
    // const workbook = XLSX.utils.book_new();
    // ... Excel conversion logic
    logger.info('Excel export requested - implement with xlsx library');
    return Buffer.from(JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error('Error converting to Excel:', error);
    throw new Error('Excel export failed');
  }
}

/**
 * Convert export data to XML format
 */
private convertToXML(data: any): string {
  try {
    // This is a placeholder - implement with a library like 'xml2js'
    logger.info('XML export requested - implement with xml2js library');
    return `<?xml version="1.0" encoding="UTF-8"?><export>${JSON.stringify(data)}</export>`;
  } catch (error) {
    logger.error('Error converting to XML:', error);
    throw new Error('XML export failed');
  }
}

/**
 * Get login history for account exports
 */
private async getLoginHistory(businessId: string): Promise<any[]> {
  try {
    // Implement login history tracking if you have this feature
    return [];
  } catch (error) {
    logger.error('Error getting login history:', error);
    return [];
  }
}

/**
 * Get profile change history for account exports
 */
private async getProfileChangeHistory(businessId: string): Promise<any[]> {
  try {
    // Implement profile change tracking if you have this feature
    return [];
  } catch (error) {
    logger.error('Error getting profile change history:', error);
    return [];
  }
}

/**
 * Get billing history for account exports
 */
private async getBillingHistory(businessId: string): Promise<any> {
  try {
    // Get billing history from your billing service
    return {};
  } catch (error) {
    logger.error('Error getting billing history:', error);
    return {};
  }
}
}
