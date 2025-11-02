// src/services/brands/core/brandAccount.service.ts
import { Business, IBusiness } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger, logSafeInfo, logSafeError } from '../../../utils/logger';
import { MediaDataService } from '../../media/core/mediaData.service';
import { storageProviderService } from '../../media/core/storageProvider.service';


export interface ProfilePictureUploadResult {
  profilePictureUrl: string;
  uploadedAt: Date;
  filename: string;
  fileSize: number;
  s3Key?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export interface ProfileMetadata {
  accountCreated: Date;
  lastLogin: Date | null;
  planInfo: {
    currentPlan: string;
    planFeatures: string[];
  };
  analytics?: any;
  customization?: any;
}

export interface DeactivationData {
  reason?: string;
  feedback?: string;
  deleteData?: boolean;
  deactivatedBy: string;
  deactivationSource: string;
}

export interface DeactivationResult {
  id: string;
  deactivatedAt: Date;
  reactivationPossible: boolean;
  dataRetentionPeriod?: number;
  reason?: string;
  feedback?: string;
}

export class BrandAccountService {
  private mediaService: MediaDataService;

  constructor() {
    this.mediaService = new MediaDataService();
  }

  /**
   * Get brand account by ID
   */
  async getBrandAccount(businessId: string): Promise<IBusiness> {
    const business = await Business.findById(businessId).select(
      'firstName lastName businessName profilePictureUrl description industry contactEmail socialUrls'
    );

    if (!business) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }

    return business;
  }

  /**
   * Get basic brand info (name and profile picture)
   */
  async getBrandBasicInfo(businessId: string): Promise<Pick<IBusiness, 'businessName' | 'profilePictureUrl'>> {
    const business = await Business.findById(businessId).select('businessName profilePictureUrl');

    if (!business) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }

    return business;
  }

  /**
   * Update brand account information
   */
  async updateBrandAccount(businessId: string, data: Partial<IBusiness>): Promise<IBusiness> {
    const allowedFields = {
      profilePictureUrl: data.profilePictureUrl,
      description: data.description,
      industry: data.industry,
      contactEmail: data.contactEmail,
      socialUrls: data.socialUrls,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName
    };

    // Remove undefined fields
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key as keyof typeof allowedFields] === undefined) {
        delete allowedFields[key as keyof typeof allowedFields];
      }
    });

    const updated = await Business.findByIdAndUpdate(
      businessId,
      allowedFields,
      { new: true }
    );

    if (!updated) {
      throw { statusCode: 404, message: 'Brand not found.' };
    }

    return updated;
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
      const media = await storageProviderService.uploadFile(file, businessId, {
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
        uploadedAt: new Date(),
        filename: file.originalname,
        fileSize: file.size,
        s3Key: media.key,
        s3Bucket: media.bucket
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      throw { statusCode: 500, message: `Failed to upload profile picture: ${error.message}` };
    }
  }

  /**
   * Get comprehensive brand account information
   */
  async getComprehensiveBrandAccount(businessId: string): Promise<any> {
    try {
      const [business, brandSettings] = await Promise.all([
        Business.findById(businessId).select('-password'),
        BrandSettings.findOne({ business: businessId })
      ]);

      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      // Calculate additional metrics
      const profileCompleteness = this.calculateProfileCompleteness(business.toObject());
      const accountAge = this.calculateAccountAge(business.createdAt);

      return {
        business: business.toObject(),
        brandSettings: brandSettings?.toObject() || null,
        profileCompleteness,
        lastActivity: business.lastLoginAt || business.updatedAt,
        accountAge,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt
      };
    } catch (error) {
      logger.error('Error getting comprehensive brand account:', error);
      throw error;
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  calculateProfileCompleteness(profile: any): number {
    const requiredFields = [
      'businessName', 'email', 'industry', 'description', 'contactEmail'
    ];
    const optionalFields = [
      'profilePictureUrl', 'socialUrls', 'headquarters',
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

  /**
   * Calculate account age in human readable format
   */
  calculateAccountAge(createdAt: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }

  /**
   * Verify password for account operations
   */
  async verifyPassword(businessId: string, password: string): Promise<boolean> {
    try {
      const business = await Business.findById(businessId).select('+password');
      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      const isValid = await business.comparePassword(password);

      logSafeInfo('Password verification attempt', { businessId, success: isValid });

      return isValid;
    } catch (error) {
      logSafeError('Error verifying password', { error: error.message, businessId });
      throw error;
    }
  }

  /**
   * Check if business exists and is active
   */
  async exists(businessId: string): Promise<boolean> {
    try {
      const business = await Business.findById(businessId).select('isActive');
      return !!(business && business.isActive !== false);
    } catch (error) {
      logger.error('Error checking business existence:', error);
      return false;
    }
  }

  /**
   * Build profile metadata including plan info and analytics
   */
  async buildProfileMetadata(businessId: string, userPlan: string): Promise<ProfileMetadata> {
    const business = await Business.findById(businessId).select('createdAt lastLoginAt');
    
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }

    return {
      accountCreated: business.createdAt,
      lastLogin: business.lastLoginAt || null,
      planInfo: {
        currentPlan: userPlan,
        planFeatures: this.getPlanFeatures(userPlan)
      },
      analytics: {
        profileViews: 0,
        certificatesMinted: 0
      }
    };
  }

  /**
   * Get plan features for a given plan level
   */
  getPlanFeatures(plan: string): string[] {
    const features = {
      foundation: ['Basic profile', 'Email support', '10 certificates/month'],
      growth: ['Advanced analytics', 'Priority support', '100 certificates/month', 'Custom branding'],
      premium: ['Custom branding', 'API access', 'Unlimited certificates', 'Custom domain'],
      enterprise: ['White-label', 'Dedicated support', 'Custom features', 'SLA guarantee']
    };
    return features[plan as keyof typeof features] || features.foundation;
  }

  /**
   * Get plan limitations for a given plan level
   */
  getPlanLimitations(plan: string): string[] {
    const limitations = {
      foundation: ['Limited analytics', 'Basic support', 'Certificate limit'],
      growth: ['No custom domain', 'Limited API access'],
      premium: ['No white-label', 'Standard SLA'],
      enterprise: []
    };
    return limitations[plan as keyof typeof limitations] || limitations.foundation;
  }

  /**
   * Generate profile recommendations based on completeness
   */
  generateProfileRecommendations(profile: any, plan: string): string[] {
    const recommendations: string[] = [];
    
    if (!profile.description) {
      recommendations.push('Add a business description to help customers understand your brand');
    }
    
    if (!profile.profilePictureUrl) {
      recommendations.push('Upload a profile picture to personalize your brand');
    }
    
    if (!profile.industry) {
      recommendations.push('Specify your industry to help with categorization');
    }
    
    if (!profile.socialUrls || profile.socialUrls.length === 0) {
      recommendations.push('Add social media links to increase brand visibility');
    }
    
    if (plan === 'foundation') {
      recommendations.push('Consider upgrading to Growth plan for advanced features');
    }
    
    return recommendations;
  }

  /**
   * Validate plan permissions for update data
   */
  validatePlanPermissions(updateData: any, userPlan: string): string[] {
    const restrictedFields: string[] = [];
    
    // Premium+ only features
    if (updateData.customDomain && !['premium', 'enterprise'].includes(userPlan)) {
      restrictedFields.push('customDomain');
    }
    
    if (updateData.whiteLabel && userPlan !== 'enterprise') {
      restrictedFields.push('whiteLabel');
    }
    
    if (updateData.apiAccess && !['premium', 'enterprise'].includes(userPlan)) {
      restrictedFields.push('apiAccess');
    }
    
    return restrictedFields;
  }

  /**
   * Handle wallet address change with validation
   */
  async handleWalletAddressChange(businessId: string, newAddress: string, oldAddress?: string): Promise<void> {
    logger.info(`Wallet address change for business ${businessId}`, {
      oldAddress,
      newAddress
    });
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress)) {
      throw { statusCode: 400, message: 'Invalid wallet address format' };
    }
    
    // Log the change for audit purposes
    logger.info('Wallet address updated successfully', {
      businessId,
      newAddress
    });
  }

  /**
   * Get changed fields between current and update data
   */
  getChangedFields(current: any, update: any): string[] {
    return Object.keys(update).filter(key => {
      const currentValue = current[key];
      const updateValue = update[key];
      
      // Handle nested objects
      if (typeof currentValue === 'object' && typeof updateValue === 'object') {
        return JSON.stringify(currentValue) !== JSON.stringify(updateValue);
      }
      
      return currentValue !== updateValue;
    });
  }

  /**
   * Handle significant profile changes with notifications
   */
  async handleSignificantProfileChanges(businessId: string, currentProfile: any, updateData: any): Promise<void> {
    const changedFields = this.getChangedFields(currentProfile, updateData);
    const significantFields = ['businessName', 'industry', 'contactEmail', 'walletAddress'];
    
    const significantChanges = changedFields.filter(field => significantFields.includes(field));
    
    if (significantChanges.length > 0) {
      logger.info('Significant profile changes detected', {
        businessId,
        changes: significantChanges
      });
    }
  }

  /**
   * Get significant changes from update
   */
  getSignificantChanges(currentProfile: any, updateData: any): string[] {
    const changedFields = this.getChangedFields(currentProfile, updateData);
    const significantFields = ['businessName', 'industry', 'contactEmail', 'walletAddress', 'description'];
    
    return changedFields.filter(field => significantFields.includes(field));
  }

  /**
   * Generate improvement recommendations
   */
  generateImprovementRecommendations(profile: any): string[] {
    const recommendations: string[] = [];
    
    if (profile.profileCompleteness && profile.profileCompleteness < 100) {
      recommendations.push('Complete your profile for better visibility');
    }
    
    if (!profile.profilePictureUrl) {
      recommendations.push('Add a professional profile picture');
    }
    
    if (!profile.socialUrls || profile.socialUrls.length < 2) {
      recommendations.push('Add more social media links to increase brand reach');
    }
    
    recommendations.push('Keep your profile information up to date');
    recommendations.push('Regularly update your business description');
    
    return recommendations;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(businessId: string): Promise<any> {
    // Placeholder - would integrate with verification service
    return {
      status: 'not_started',
      submittedAt: null,
      verifiedAt: null,
      documents: []
    };
  }

  /**
   * Get required verification documents for plan
   */
  getRequiredVerificationDocs(userPlan: string): string[] {
    const docs = {
      foundation: ['businessLicense'],
      growth: ['businessLicense', 'taxDocument'],
      premium: ['businessLicense', 'taxDocument', 'proofOfAddress'],
      enterprise: ['businessLicense', 'taxDocument', 'proofOfAddress', 'additionalDocuments']
    };
    return docs[userPlan as keyof typeof docs] || docs.foundation;
  }

  /**
   * Submit verification documents
   */
  async submitVerification(businessId: string, data: any): Promise<any> {
    // Placeholder - would integrate with verification service
    logger.info('Verification submitted for business', { businessId });
    
    return {
      id: `verification_${Date.now()}`,
      businessId,
      status: 'submitted',
      submittedAt: new Date(),
      documents: Object.keys(data).filter(key => key !== 'verificationNotes')
    };
  }

  /**
   * Get detailed verification status
   */
  async getDetailedVerificationStatus(businessId: string): Promise<any> {
    return {
      status: 'not_started',
      progress: 0,
      submittedAt: null,
      reviewedAt: null,
      verifiedAt: null,
      documents: [],
      notes: []
    };
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(businessId: string): Promise<any[]> {
    // Placeholder - would query verification history
    return [];
  }

  /**
   * Deactivate account
   */
  async deactivateAccount(businessId: string, data: DeactivationData): Promise<DeactivationResult> {
    await Business.findByIdAndUpdate(businessId, {
      isActive: false,
      deactivatedAt: new Date(),
      deactivationReason: data.reason,
      deactivatedBy: data.deactivatedBy
    });
    
    logger.info('Account deactivated', {
      businessId,
      reason: data.reason,
      deleteData: data.deleteData
    });
    
    return {
      id: `deactivation_${Date.now()}`,
      deactivatedAt: new Date(),
      reactivationPossible: !data.deleteData,
      dataRetentionPeriod: data.deleteData ? 30 : 365,
      reason: data.reason,
      feedback: data.feedback
    };
  }

  /**
   * Get account analytics
   */
  async getAccountAnalytics(businessId: string, options: any): Promise<any> {
    // Placeholder - would integrate with analytics service
    return {
      profileViews: 0,
      certificatesMinted: 0,
      engagement: {
        rate: 0
      },
      conversions: {
        rate: 0
      },
      timeframe: options.timeframe
    };
  }

  /**
   * Get profile performance metrics
   */
  async getProfilePerformance(businessId: string): Promise<any> {
    return {
      views: 0,
      engagement: 0,
      completeness: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Export account data
   */
  async exportAccountData(businessId: string, options: any): Promise<any> {
    const business = await Business.findById(businessId).select('-password');
    
    if (!business) {
      throw { statusCode: 404, message: 'Business not found' };
    }
    
    const exportData = {
      profile: business.toObject(),
      exportedAt: new Date().toISOString(),
      format: options.format,
      includeAnalytics: options.includeAnalytics,
      includeHistory: options.includeHistory
    };
    
    if (options.format === 'json') {
      return exportData;
    }
    
    // For other formats, return stringified data
    return JSON.stringify(exportData, null, 2);
  }
}

export const brandAccountCoreService = new BrandAccountService();
