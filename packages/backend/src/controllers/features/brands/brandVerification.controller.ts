// src/controllers/features/brands/brandVerification.controller.ts
// Brand verification controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container/container.getters';  

/**
 * Brand verification request interfaces
 */
interface SubmitVerificationRequest extends BaseRequest {
  validatedBody: {
    businessLicense?: string;
    taxId?: string;
    businessRegistration?: string;
    bankStatement?: string;
    identityDocument?: string;
    additionalDocuments?: string[];
  };
}

interface VerifyEmailRequest extends BaseRequest {
  validatedBody: {
    verificationCode: string;
  };
}

interface UpdateBusinessVerificationRequest extends BaseRequest {
  validatedBody: {
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    reviewerId?: string;
  };
}

interface GetVerificationStatisticsRequest extends BaseRequest {
  validatedQuery?: {
    timeframe?: string;
    status?: string;
  };
}

/**
 * Brand verification controller
 */
export class BrandVerificationController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Get verification status for a business
   */
  async getVerificationStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_STATUS');

        const status = await this.brandServices.verification.getVerificationStatus(req.businessId!);
        
        this.logAction(req, 'GET_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          overallStatus: status.overallStatus,
          businessVerified: status.business.verified
        });

        return { status };
      });
    }, res, 'Verification status retrieved', this.getRequestMeta(req));
  }

  /**
   * Submit verification documents
   */
  async submitVerification(req: SubmitVerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SUBMIT_VERIFICATION');

        const verificationData = {
          type: 'business' as const,
          documents: [
            req.validatedBody.businessLicense,
            req.validatedBody.taxId,
            req.validatedBody.businessRegistration,
            req.validatedBody.bankStatement,
            req.validatedBody.identityDocument,
            ...(req.validatedBody.additionalDocuments || [])
          ].filter(Boolean),
          additionalInfo: {
            businessLicense: req.validatedBody.businessLicense,
            taxId: req.validatedBody.taxId,
            businessRegistration: req.validatedBody.businessRegistration
          }
        };

        const result = await this.brandServices.verification.submitVerification(req.businessId!, verificationData);
        
        this.logAction(req, 'SUBMIT_VERIFICATION_SUCCESS', {
          businessId: req.businessId,
          submissionId: result.verificationId,
          documentsSubmitted: verificationData.documents.length
        });

        return { result };
      });
    }, res, 'Verification documents submitted', this.getRequestMeta(req));
  }

  /**
   * Get detailed verification status
   */
  async getDetailedVerificationStatus(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_DETAILED_VERIFICATION_STATUS');

        const status = await this.brandServices.verification.getDetailedVerificationStatus(req.businessId!);
        
        this.logAction(req, 'GET_DETAILED_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          overallStatus: status.overallStatus,
          businessVerified: status.business.verified,
          pendingCount: status.pending?.length || 0
        });

        return { status };
      });
    }, res, 'Detailed verification status retrieved', this.getRequestMeta(req));
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_HISTORY');

        const history = await this.brandServices.verification.getVerificationHistory(req.businessId!);
        
        this.logAction(req, 'GET_VERIFICATION_HISTORY_SUCCESS', {
          businessId: req.businessId,
          historyCount: history.length
        });

        return { history };
      });
    }, res, 'Verification history retrieved', this.getRequestMeta(req));
  }

  /**
   * Verify email address
   */
  async verifyEmail(req: VerifyEmailRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'VERIFY_EMAIL');

        const result = await this.brandServices.verification.verifyEmail(
          req.businessId!,
          req.validatedBody.verificationCode
        );
        
        this.logAction(req, 'VERIFY_EMAIL_SUCCESS', {
          businessId: req.businessId,
          verified: result.verified,
          message: result.message
        });

        return { result };
      });
    }, res, 'Email verified successfully', this.getRequestMeta(req));
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SEND_EMAIL_VERIFICATION');

        const result = await this.brandServices.verification.sendEmailVerification(req.businessId!);
        
        this.logAction(req, 'SEND_EMAIL_VERIFICATION_SUCCESS', {
          businessId: req.businessId,
          sent: result.sent,
          message: result.message
        });

        return { result };
      });
    }, res, 'Email verification sent', this.getRequestMeta(req));
  }

  /**
   * Update business verification status (admin only)
   */
  async updateBusinessVerificationStatus(req: UpdateBusinessVerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'UPDATE_BUSINESS_VERIFICATION_STATUS');

        const status = req.validatedBody.status === 'approved' ? 'verified' : req.validatedBody.status === 'rejected' ? 'rejected' : 'pending';
        const reviewedBy = req.validatedBody.reviewerId || req.userId!;
        const notes = req.validatedBody.notes;

        await this.brandServices.verification.updateBusinessVerificationStatus(
          req.businessId!,
          status,
          reviewedBy,
          notes
        );
        
        this.logAction(req, 'UPDATE_BUSINESS_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          status,
          reviewedBy
        });

        return { message: 'Business verification status updated' };
      });
    }, res, 'Business verification status updated', this.getRequestMeta(req));
  }

  /**
   * Get verification statistics
   */
  async getVerificationStatistics(req: GetVerificationStatisticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_STATISTICS');

        const stats = await this.brandServices.verification.getVerificationStatistics(req.businessId);
        
        this.logAction(req, 'GET_VERIFICATION_STATISTICS_SUCCESS', {
          businessId: req.businessId,
          totalVerifications: stats.totalVerifications,
          pendingVerifications: stats.pendingVerifications
        });

        return { stats };
      });
    }, res, 'Verification statistics retrieved', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandVerificationController = new BrandVerificationController();