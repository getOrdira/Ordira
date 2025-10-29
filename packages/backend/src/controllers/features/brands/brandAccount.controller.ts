// src/controllers/features/brands/brandAccount.controller.ts
// Brand account controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { BrandServices } from '../../../services/brands';
import { getNotificationsServices } from '../../../services/notifications';

/**
 * Brand account request interfaces
 */
interface UpdateProfileRequest extends BaseRequest {
  validatedBody: {
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

interface VerificationRequest extends BaseRequest {
  validatedBody: {
    businessLicense?: string;
    taxId?: string;
    businessRegistration?: string;
    bankStatement?: string;
    identityDocument?: string;
    additionalDocuments?: string[];
  };
}

interface UploadProfilePictureRequest extends BaseRequest {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}

interface GetProfileRequest extends BaseRequest {
  validatedQuery?: {
    includeAnalytics?: boolean;
    includeMetadata?: boolean;
  };
}

/**
 * Brand account controller
 */
export class BrandAccountController extends BaseController {
  private brandServices = BrandServices;
  private notificationServices = getNotificationsServices();

  /**
   * GET /api/brands/profile
   * Get brand profile information
   */
  async getProfile(req: GetProfileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_BRAND_PROFILE');

        const profile = await this.brandServices.account.getComprehensiveBrandAccount(req.businessId!);

        this.logAction(req, 'GET_PROFILE_SUCCESS', {
          businessId: req.businessId,
          includeAnalytics: req.validatedQuery?.includeAnalytics
        });

        return { profile };
      });
    }, res, 'Profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * PUT /api/brands/profile
   * Update brand profile information
   */
  async updateProfile(req: UpdateProfileRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_BRAND_PROFILE');

        const sanitizedData = this.sanitizeInput(req.validatedBody);
        
        const updatedProfile = await this.brandServices.account.updateBrandAccount(
          req.businessId!,
          sanitizedData
        );

        // Send notification about profile update
        await this.notificationServices.workflows.eventHandlerService.handle({
          type: 'account.updated' as any,
          recipient: { email: req.userId }, // Use userId instead of user.email
          payload: {
            email: req.userId,
            name: req.businessId,
            accountType: 'business',
            brandName: req.businessId
          }
        });

        this.logAction(req, 'UPDATE_PROFILE_SUCCESS', {
          businessId: req.businessId,
          updatedFields: Object.keys(sanitizedData)
        });

        return { profile: updatedProfile };
      });
    }, res, 'Profile updated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/brands/profile/picture
   * Upload profile picture
   */
  async uploadProfilePicture(req: UploadProfilePictureRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPLOAD_PROFILE_PICTURE');

        if (!req.file) {
          throw new Error('Profile picture file is required');
        }

        const uploadResult = await this.brandServices.account.uploadProfilePicture(
          req.businessId!,
          req.file as Express.Multer.File
        );

        this.logAction(req, 'UPLOAD_PROFILE_PICTURE_SUCCESS', {
          businessId: req.businessId,
          filename: uploadResult.filename,
          fileSize: uploadResult.fileSize
        });

        return { uploadResult };
      });
    }, res, 'Profile picture uploaded successfully', this.getRequestMeta(req));
  }

  /**
   * DELETE /api/brands/profile/picture
   * Remove profile picture
   */
  async removeProfilePicture(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REMOVE_PROFILE_PICTURE');

        // Remove profile picture by updating to null
        await this.brandServices.account.updateBrandAccount(req.businessId!, {
          profilePictureUrl: null
        });

        this.logAction(req, 'REMOVE_PROFILE_PICTURE_SUCCESS', {
          businessId: req.businessId
        });

        return { message: 'Profile picture removed successfully' };
      });
    }, res, 'Profile picture removed successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/brands/verification
   * Submit verification documents
   */
  async submitVerification(req: VerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SUBMIT_VERIFICATION');

        const verificationResult = await this.brandServices.account.submitVerification(
          req.businessId!,
          req.validatedBody
        );

        // Send notification about verification submission
        await this.notificationServices.workflows.eventHandlerService.handle({
          type: 'verification.submitted' as any,
          recipient: { email: req.userId },
          payload: {
            submissionId: verificationResult.id,
            submittedAt: verificationResult.submittedAt,
            documentsSubmitted: Object.keys(req.validatedBody).length
          }
        });

        this.logAction(req, 'SUBMIT_VERIFICATION_SUCCESS', {
          businessId: req.businessId,
          submissionId: verificationResult.id
        });

        return { verificationResult };
      });
    }, res, 'Verification documents submitted successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/verification/status
   * Get verification status
   */
  async getVerificationStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_STATUS');

        const status = await this.brandServices.account.getVerificationStatus(req.businessId!);

        this.logAction(req, 'GET_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          status: status.status
        });

        return { status };
      });
    }, res, 'Verification status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/profile/completeness
   * Get profile completeness score
   */
  async getProfileCompleteness(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PROFILE_COMPLETENESS');

        // Get comprehensive profile which includes completeness
        const profile = await this.brandServices.account.getComprehensiveBrandAccount(req.businessId!);
        const completeness = {
          score: profile.profileCompleteness,
          recommendations: this.brandServices.account.generateProfileRecommendations(
            profile.business, 
            'foundation' // Would need to get actual plan
          )
        };

        this.logAction(req, 'GET_PROFILE_COMPLETENESS_SUCCESS', {
          businessId: req.businessId,
          score: completeness.score
        });

        return { completeness };
      });
    }, res, 'Profile completeness retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/profile/recommendations
   * Get profile improvement recommendations
   */
  async getProfileRecommendations(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PROFILE_RECOMMENDATIONS');

        // Get profile and generate recommendations
        const profile = await this.brandServices.account.getComprehensiveBrandAccount(req.businessId!);
        const recommendations = this.brandServices.account.generateImprovementRecommendations(profile.business);

        this.logAction(req, 'GET_PROFILE_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          recommendationCount: recommendations.length
        });

        return { recommendations };
      });
    }, res, 'Profile recommendations retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/brands/profile/deactivate
   * Deactivate brand account
   */
  async deactivateAccount(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'DEACTIVATE_ACCOUNT');

        const deactivationData = await this.brandServices.account.deactivateAccount(
          req.businessId!,
          {
            reason: req.body.reason || 'User requested',
            feedback: req.body.feedback,
            deleteData: req.body.deleteData || false,
            deactivatedBy: req.userId!,
            deactivationSource: 'api'
          }
        );

        // Send notification about account deactivation
        await this.notificationServices.workflows.eventHandlerService.handle({
          type: 'account.deactivated' as any,
          recipient: { email: req.userId },
          payload: {
            deactivatedAt: deactivationData.deactivatedAt,
            reason: deactivationData.reason,
            dataRetentionPeriod: deactivationData.dataRetentionPeriod
          }
        });

        this.logAction(req, 'DEACTIVATE_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          deactivatedAt: deactivationData.deactivatedAt
        });

        return { deactivationData };
      });
    }, res, 'Account deactivated successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/brands/profile/reactivate
   * Reactivate brand account
   */
  async reactivateAccount(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REACTIVATE_ACCOUNT');

        // Reactivation would need to be implemented in service
        // For now, just update isActive to true
        const reactivationData = await this.brandServices.account.updateBrandAccount(req.businessId!, {
          isActive: true
        });
        
        const reactivationResult = {
          reactivatedAt: new Date(),
          previousDeactivationDate: null // Would need to track this
        };

        // Send notification about account reactivation
        await this.notificationServices.workflows.eventHandlerService.handle({
          type: 'account.reactivated' as any,
          recipient: { email: req.userId },
          payload: {
            reactivatedAt: reactivationResult.reactivatedAt,
            previousDeactivationDate: reactivationResult.previousDeactivationDate
          }
        });

        this.logAction(req, 'REACTIVATE_ACCOUNT_SUCCESS', {
          businessId: req.businessId,
          reactivatedAt: reactivationResult.reactivatedAt
        });

        return { reactivationData: reactivationResult };
      });
    }, res, 'Account reactivated successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandAccountController = new BrandAccountController();
