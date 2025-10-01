// src/services/brands/core/brandAccount.service.ts
import { Business, IBusiness } from '../../../models/business.model';
import { BrandSettings } from '../../../models/brandSettings.model';
import { logger, logSafeInfo, logSafeError } from '../../../utils/logger';
import { MediaService } from '../../business/media.service';

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
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
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
}

export const brandAccountCoreService = new BrandAccountService();