// src/controllers/features/manufacturers/manufacturerVerification.controller.ts
// Manufacturer verification controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { verificationService } from '../../../services/manufacturers/features/verification.service';

/**
 * Manufacturer verification request interfaces
 */
interface GetVerificationStatusRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface GetDetailedVerificationStatusRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface SubmitVerificationDocumentsRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  files?: Express.Multer.File[];
  validatedBody?: {
    metadata?: any;
  };
}

interface ReviewVerificationSubmissionRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedBody: {
    submissionId: string;
    decision: 'approve' | 'reject';
    reviewNotes?: string;
    reviewerId?: string;
  };
}

interface GetVerificationRequirementsRequest extends BaseRequest {
  validatedQuery?: {
    plan?: string;
  };
}

interface CheckVerificationEligibilityRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

/**
 * Manufacturer verification controller
 */
export class ManufacturerVerificationController extends BaseController {
  private verificationService = verificationService;

  /**
   * GET /api/manufacturers/:manufacturerId/verification/status
   * Get verification status
   */
  async getVerificationStatus(req: GetVerificationStatusRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_STATUS');

        const verificationStatus = await this.verificationService.getVerificationStatus(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          isVerified: verificationStatus.isVerified,
          status: verificationStatus.status,
          requirementsCount: verificationStatus.requirements.length,
          documentsCount: verificationStatus.documents.length
        });

        return { verificationStatus };
      });
    }, res, 'Verification status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/verification/detailed-status
   * Get detailed verification status
   */
  async getDetailedVerificationStatus(req: GetDetailedVerificationStatusRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_DETAILED_VERIFICATION_STATUS');

        const detailedStatus = await this.verificationService.getDetailedVerificationStatus(req.validatedParams.manufacturerId);

        this.logAction(req, 'GET_DETAILED_VERIFICATION_STATUS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          isVerified: detailedStatus.verification.isVerified,
          status: detailedStatus.verification.status,
          completionPercentage: detailedStatus.progress.completionPercentage,
          timelineEventsCount: detailedStatus.timeline.length,
          recommendationsCount: detailedStatus.recommendations.length
        });

        return { detailedStatus };
      });
    }, res, 'Detailed verification status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/verification/submit-documents
   * Submit verification documents
   */
  async submitVerificationDocuments(req: SubmitVerificationDocumentsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'SUBMIT_VERIFICATION_DOCUMENTS');

        if (!req.files || req.files.length === 0) {
          throw new Error('At least one document file is required');
        }

        const submissionResult = await this.verificationService.submitVerificationDocuments(
          req.validatedParams.manufacturerId,
          req.files as Express.Multer.File[],
          req.validatedBody?.metadata
        );

        this.logAction(req, 'SUBMIT_VERIFICATION_DOCUMENTS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          submissionId: submissionResult.submissionId,
          status: submissionResult.status,
          documentCount: submissionResult.documentCount,
          estimatedReviewTime: submissionResult.estimatedReviewTime,
          submittedAt: submissionResult.submittedAt,
          nextStepsCount: submissionResult.nextSteps.length
        });

        return { submissionResult };
      });
    }, res, 'Verification documents submitted successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/:manufacturerId/verification/review
   * Review verification submission
   */
  async reviewVerificationSubmission(req: ReviewVerificationSubmissionRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'REVIEW_VERIFICATION_SUBMISSION');

        const reviewResult = await this.verificationService.reviewVerificationSubmission(
          req.validatedParams.manufacturerId,
          req.validatedBody.submissionId,
          req.validatedBody.decision,
          req.validatedBody.reviewNotes,
          req.validatedBody.reviewerId
        );

        this.logAction(req, 'REVIEW_VERIFICATION_SUBMISSION_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          submissionId: req.validatedBody.submissionId,
          decision: req.validatedBody.decision,
          status: reviewResult.status,
          reviewedAt: reviewResult.reviewedAt,
          reviewerId: req.validatedBody.reviewerId
        });

        return { reviewResult };
      });
    }, res, 'Verification submission reviewed successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/verification/requirements
   * Get verification requirements
   */
  async getVerificationRequirements(req: GetVerificationRequirementsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_VERIFICATION_REQUIREMENTS');

        const plan = req.validatedQuery?.plan || 'basic';
        const requirements = this.verificationService.getVerificationRequirements(plan);

        this.logAction(req, 'GET_VERIFICATION_REQUIREMENTS_SUCCESS', {
          businessId: req.businessId,
          plan,
          requirementsCount: requirements.length,
          requiredCount: requirements.filter(r => r.required).length,
          optionalCount: requirements.filter(r => !r.required).length
        });

        return { requirements };
      });
    }, res, 'Verification requirements retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/verification/eligibility
   * Check verification eligibility
   */
  async checkVerificationEligibility(req: CheckVerificationEligibilityRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CHECK_VERIFICATION_ELIGIBILITY');

        const eligibility = await this.verificationService.checkVerificationEligibility(req.validatedParams.manufacturerId);

        this.logAction(req, 'CHECK_VERIFICATION_ELIGIBILITY_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          eligible: eligibility.eligible,
          missingRequirementsCount: eligibility.missingRequirements.length,
          recommendationsCount: eligibility.recommendations.length
        });

        return { eligibility };
      });
    }, res, 'Verification eligibility checked successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerVerificationController = new ManufacturerVerificationController();
