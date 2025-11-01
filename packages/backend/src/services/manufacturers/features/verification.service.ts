// src/services/manufacturers/features/verification.service.ts

import { Manufacturer } from '../../../models/deprecated/manufacturer.model';
import { Media } from '../../../models/deprecated/media.model';
import { logger } from '../../../utils/logger';
import { MediaService } from '../../business/media.service';
import { v4 as uuidv4 } from 'uuid';

export interface VerificationStatus {
  isVerified: boolean;
  status: 'unverified' | 'pending' | 'approved' | 'rejected' | 'expired';
  submittedAt?: Date;
  reviewedAt?: Date;
  expiresAt?: Date;
  reviewer?: string;
  requirements: VerificationRequirement[];
  documents: VerificationDocument[];
  rejectionReasons?: string[];
  nextSteps?: string[];
}

export interface VerificationRequirement {
  type: 'business_license' | 'tax_certificate' | 'facility_photos' | 'certifications' | 'insurance' | 'references';
  name: string;
  description: string;
  required: boolean;
  completed: boolean;
  documentUrl?: string;
  notes?: string;
}

export interface VerificationDocument {
  id: string;
  type: 'business_license' | 'tax_certificate' | 'facility_photos' | 'certifications' | 'insurance' | 'references';
  filename: string;
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface VerificationSubmissionData {
  documents: Express.Multer.File[];
  businessLicense?: string;
  taxCertificate?: string;
  facilityPhotos?: string[];
  certifications?: string[];
  insurance?: string;
  references?: string[];
  additionalNotes?: string;
}

export interface VerificationSubmissionResult {
  submissionId: string;
  status: 'submitted' | 'received' | 'under_review';
  estimatedReviewTime: string;
  documentCount: number;
  submittedAt: Date;
  nextSteps: string[];
}

export interface DetailedVerificationStatus {
  verification: VerificationStatus;
  progress: {
    completedRequirements: number;
    totalRequirements: number;
    completionPercentage: number;
  };
  timeline: Array<{
    date: Date;
    action: string;
    description: string;
    actor?: string;
  }>;
  recommendations: string[];
}

/**
 * Custom error class for verification operations
 */
class VerificationError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'VerificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Manufacturer verification service - handles business verification workflow
 * Extracted from original manufacturerAccount.service.ts
 */
export class VerificationService {
  private mediaService: MediaService;

  constructor() {
    this.mediaService = new MediaService();
  }

  /**
   * Get detailed verification status for a manufacturer
   */
  async getVerificationStatus(mfgId: string): Promise<VerificationStatus> {
    try {
      const manufacturer = await Manufacturer.findById(mfgId).select(
        'isVerified verifiedAt businessLicense certifications verificationSubmittedAt verificationStatus'
      );

      if (!manufacturer) {
        throw new VerificationError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Define verification requirements
      const requirements: VerificationRequirement[] = [
        {
          type: 'business_license',
          name: 'Business License',
          description: 'Valid business registration or incorporation documents',
          required: true,
          completed: !!manufacturer.businessLicense
        },
        {
          type: 'tax_certificate',
          name: 'Tax Certificate',
          description: 'Tax registration certificate or VAT number',
          required: true,
          completed: false // Add logic based on your model
        },
        {
          type: 'facility_photos',
          name: 'Facility Photos',
          description: 'Photos of manufacturing facilities and equipment',
          required: true,
          completed: false // Add logic based on your model
        },
        {
          type: 'certifications',
          name: 'Industry Certifications',
          description: 'Relevant industry certifications (ISO, etc.)',
          required: false,
          completed: !!(manufacturer.certifications && manufacturer.certifications.length > 0)
        },
        {
          type: 'insurance',
          name: 'Business Insurance',
          description: 'Proof of business liability insurance',
          required: false,
          completed: false // Add logic based on your model
        },
        {
          type: 'references',
          name: 'Business References',
          description: 'Professional references from previous clients',
          required: false,
          completed: false // Add logic based on your model
        }
      ];

      // Get verification documents from media
      const documents = await Media.find({
        uploadedBy: mfgId,
        category: 'certificate'
      }).select('filename url createdAt metadata');

      const verificationDocuments: VerificationDocument[] = documents.map(doc => ({
        id: doc._id.toString(),
        type: this.determineDocumentType(doc.filename, doc.metadata),
        filename: doc.filename,
        url: doc.url,
        uploadedAt: doc.createdAt,
        status: 'pending' // Add logic for review status
      }));

      return {
        isVerified: manufacturer.isVerified || false,
        status: this.determineVerificationStatus(manufacturer),
        submittedAt: manufacturer.verificationSubmittedAt,
        reviewedAt: manufacturer.verifiedAt,
        requirements,
        documents: verificationDocuments,
        nextSteps: this.generateNextSteps(manufacturer, requirements)
      };
    } catch (error: any) {
      if (error instanceof VerificationError) {
        throw error;
      }
      throw new VerificationError(`Failed to get verification status: ${error.message}`, 500, 'VERIFICATION_STATUS_ERROR');
    }
  }

  /**
   * Get detailed verification status with progress tracking
   */
  async getDetailedVerificationStatus(mfgId: string): Promise<DetailedVerificationStatus> {
    try {
      const verification = await this.getVerificationStatus(mfgId);

      // Calculate progress
      const completedRequirements = verification.requirements.filter(req => req.completed).length;
      const totalRequirements = verification.requirements.filter(req => req.required).length;
      const completionPercentage = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

      // Generate timeline
      const timeline = await this.generateVerificationTimeline(mfgId);

      // Generate recommendations
      const recommendations = this.generateVerificationRecommendations(verification);

      return {
        verification,
        progress: {
          completedRequirements,
          totalRequirements,
          completionPercentage
        },
        timeline,
        recommendations
      };
    } catch (error: any) {
      if (error instanceof VerificationError) {
        throw error;
      }
      throw new VerificationError(`Failed to get detailed verification status: ${error.message}`, 500, 'DETAILED_STATUS_ERROR');
    }
  }

  /**
   * Submit verification documents
   */
  async submitVerificationDocuments(
    mfgId: string,
    files: Express.Multer.File[],
    metadata?: any
  ): Promise<VerificationSubmissionResult> {
    try {
      if (!files || files.length === 0) {
        throw new VerificationError('Verification documents are required', 400, 'MISSING_DOCUMENTS');
      }

      const submissionId = uuidv4();
      const submittedAt = new Date();

      // Validate file types and sizes
      this.validateVerificationDocuments(files);

      // Upload documents through media service
      const uploadResults = await this.mediaService.saveMultipleMedia(files, mfgId, {
        category: 'certificate',
        description: 'Verification documents',
        isPublic: false
      });

      if (uploadResults.failed.length > 0) {
        throw new VerificationError(
          `Failed to upload some documents: ${uploadResults.failed.map(f => f.error).join(', ')}`,
          400,
          'UPLOAD_FAILED'
        );
      }

      // Update manufacturer verification status
      await Manufacturer.findByIdAndUpdate(mfgId, {
        verificationSubmittedAt: submittedAt,
        verificationSubmissionId: submissionId,
        verificationStatus: 'pending'
      });

      // Log the submission
      logger.info(`Verification documents submitted for manufacturer ${mfgId}`, {
        submissionId,
        documentCount: files.length,
        submittedAt
      });

      const nextSteps = [
        'Your documents have been received and are under review',
        'You will receive an email confirmation within 24 hours',
        'Review typically takes 3-5 business days',
        'You can check your verification status anytime in your account'
      ];

      return {
        submissionId,
        status: 'submitted',
        estimatedReviewTime: '3-5 business days',
        documentCount: files.length,
        submittedAt,
        nextSteps
      };
    } catch (error: any) {
      if (error instanceof VerificationError) {
        throw error;
      }
      throw new VerificationError(`Failed to submit verification documents: ${error.message}`, 500, 'SUBMISSION_ERROR');
    }
  }

  /**
   * Review verification submission (admin function)
   */
  async reviewVerificationSubmission(
    mfgId: string,
    submissionId: string,
    decision: 'approve' | 'reject',
    reviewNotes?: string,
    reviewerId?: string
  ): Promise<{
    success: boolean;
    status: 'approved' | 'rejected';
    reviewedAt: Date;
    message: string;
  }> {
    try {
      const reviewedAt = new Date();

      if (decision === 'approve') {
        await Manufacturer.findByIdAndUpdate(mfgId, {
          isVerified: true,
          verifiedAt: reviewedAt,
          verificationStatus: 'approved',
          verificationReviewNotes: reviewNotes,
          verificationReviewerId: reviewerId
        });

        logger.info(`Verification approved for manufacturer ${mfgId}`, {
          submissionId,
          reviewerId,
          reviewedAt
        });

        return {
          success: true,
          status: 'approved',
          reviewedAt,
          message: 'Verification approved successfully'
        };
      } else {
        await Manufacturer.findByIdAndUpdate(mfgId, {
          isVerified: false,
          verificationStatus: 'rejected',
          verificationRejectionReasons: reviewNotes ? [reviewNotes] : [],
          verificationReviewNotes: reviewNotes,
          verificationReviewerId: reviewerId,
          verificationReviewedAt: reviewedAt
        });

        logger.info(`Verification rejected for manufacturer ${mfgId}`, {
          submissionId,
          reviewerId,
          reviewNotes,
          reviewedAt
        });

        return {
          success: true,
          status: 'rejected',
          reviewedAt,
          message: 'Verification rejected'
        };
      }
    } catch (error: any) {
      throw new VerificationError(`Failed to review verification: ${error.message}`, 500, 'REVIEW_ERROR');
    }
  }

  /**
   * Get verification requirements for a specific plan
   */
  getVerificationRequirements(plan: string = 'basic'): VerificationRequirement[] {
    const baseRequirements: VerificationRequirement[] = [
      {
        type: 'business_license',
        name: 'Business License',
        description: 'Valid business registration or incorporation documents',
        required: true,
        completed: false
      },
      {
        type: 'tax_certificate',
        name: 'Tax Certificate',
        description: 'Tax registration certificate or VAT number',
        required: true,
        completed: false
      }
    ];

    const premiumRequirements: VerificationRequirement[] = [
      {
        type: 'facility_photos',
        name: 'Facility Photos',
        description: 'Photos of manufacturing facilities and equipment',
        required: true,
        completed: false
      },
      {
        type: 'certifications',
        name: 'Industry Certifications',
        description: 'Relevant industry certifications (ISO, etc.)',
        required: false,
        completed: false
      }
    ];

    const enterpriseRequirements: VerificationRequirement[] = [
      {
        type: 'insurance',
        name: 'Business Insurance',
        description: 'Proof of business liability insurance',
        required: true,
        completed: false
      },
      {
        type: 'references',
        name: 'Business References',
        description: 'Professional references from previous clients',
        required: false,
        completed: false
      }
    ];

    let requirements = [...baseRequirements];

    if (['premium', 'enterprise'].includes(plan)) {
      requirements = [...requirements, ...premiumRequirements];
    }

    if (plan === 'enterprise') {
      requirements = [...requirements, ...enterpriseRequirements];
    }

    return requirements;
  }

  /**
   * Check if manufacturer meets verification requirements
   */
  async checkVerificationEligibility(mfgId: string): Promise<{
    eligible: boolean;
    missingRequirements: string[];
    recommendations: string[];
  }> {
    try {
      const manufacturer = await Manufacturer.findById(mfgId);

      if (!manufacturer) {
        throw new VerificationError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      const missingRequirements: string[] = [];
      const recommendations: string[] = [];

      // Check basic profile completeness
      if (!manufacturer.name || manufacturer.name.trim() === '') {
        missingRequirements.push('Business name');
      }

      if (!manufacturer.description || manufacturer.description.length < 50) {
        missingRequirements.push('Detailed business description');
      }

      if (!manufacturer.industry) {
        missingRequirements.push('Business industry');
      }

      if (!manufacturer.contactEmail) {
        missingRequirements.push('Contact email');
      }

      if (!manufacturer.headquarters?.country) {
        missingRequirements.push('Business headquarters location');
      }

      // Check account status
      if (!manufacturer.isEmailVerified) {
        missingRequirements.push('Email verification');
        recommendations.push('Verify your email address first');
      }

      if (!manufacturer.isActive) {
        missingRequirements.push('Active account status');
        recommendations.push('Reactivate your account');
      }

      // Generate recommendations
      if (missingRequirements.length > 0) {
        recommendations.push('Complete your business profile before applying for verification');
        recommendations.push('Ensure all contact information is accurate and up-to-date');
      }

      const eligible = missingRequirements.length === 0;

      if (eligible) {
        recommendations.push('Your profile meets the basic requirements for verification');
        recommendations.push('Prepare your business documents for submission');
      }

      return {
        eligible,
        missingRequirements,
        recommendations
      };
    } catch (error: any) {
      if (error instanceof VerificationError) {
        throw error;
      }
      throw new VerificationError(`Failed to check verification eligibility: ${error.message}`, 500, 'ELIGIBILITY_CHECK_ERROR');
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Determine verification status from manufacturer data
   */
  private determineVerificationStatus(manufacturer: any): VerificationStatus['status'] {
    if (manufacturer.isVerified) {
      return 'approved';
    }

    if (manufacturer.verificationStatus) {
      return manufacturer.verificationStatus;
    }

    if (manufacturer.verificationSubmittedAt) {
      return 'pending';
    }

    return 'unverified';
  }

  /**
   * Determine document type from filename and metadata
   */
  private determineDocumentType(filename: string, metadata?: any): VerificationDocument['type'] {
    const lowerFilename = filename.toLowerCase();

    if (metadata?.documentType) {
      return metadata.documentType;
    }

    if (lowerFilename.includes('license') || lowerFilename.includes('registration')) {
      return 'business_license';
    }

    if (lowerFilename.includes('tax') || lowerFilename.includes('vat')) {
      return 'tax_certificate';
    }

    if (lowerFilename.includes('facility') || lowerFilename.includes('photo') || lowerFilename.includes('image')) {
      return 'facility_photos';
    }

    if (lowerFilename.includes('cert') || lowerFilename.includes('iso')) {
      return 'certifications';
    }

    if (lowerFilename.includes('insurance')) {
      return 'insurance';
    }

    if (lowerFilename.includes('reference') || lowerFilename.includes('recommendation')) {
      return 'references';
    }

    return 'certifications'; // Default
  }

  /**
   * Generate next steps based on current status
   */
  private generateNextSteps(manufacturer: any, requirements: VerificationRequirement[]): string[] {
    const nextSteps: string[] = [];

    if (manufacturer.isVerified) {
      nextSteps.push('Your business is verified! You have access to all verification benefits.');
      return nextSteps;
    }

    const incompleteRequirements = requirements.filter(req => req.required && !req.completed);

    if (incompleteRequirements.length > 0) {
      nextSteps.push('Complete the following required documents:');
      incompleteRequirements.forEach(req => {
        nextSteps.push(`" ${req.name}: ${req.description}`);
      });
    }

    if (manufacturer.verificationSubmittedAt && !manufacturer.verifiedAt) {
      nextSteps.push('Your verification is under review');
      nextSteps.push('You will receive an email once the review is complete');
    } else {
      nextSteps.push('Submit verification application once all documents are ready');
    }

    return nextSteps;
  }

  /**
   * Generate verification timeline
   */
  private async generateVerificationTimeline(mfgId: string): Promise<Array<{
    date: Date;
    action: string;
    description: string;
    actor?: string;
  }>> {
    try {
      const manufacturer = await Manufacturer.findById(mfgId);
      const timeline: Array<{
        date: Date;
        action: string;
        description: string;
        actor?: string;
      }> = [];

      if (manufacturer?.createdAt) {
        timeline.push({
          date: manufacturer.createdAt,
          action: 'Account Created',
          description: 'Manufacturer account was created'
        });
      }

      if (manufacturer?.verificationSubmittedAt) {
        timeline.push({
          date: manufacturer.verificationSubmittedAt,
          action: 'Documents Submitted',
          description: 'Verification documents were submitted for review'
        });
      }

      if (manufacturer?.verificationReviewedAt) {
        timeline.push({
          date: manufacturer.verificationReviewedAt,
          action: manufacturer.isVerified ? 'Verification Approved' : 'Verification Rejected',
          description: manufacturer.isVerified ? 'Business verification was approved' : 'Verification was rejected',
          actor: manufacturer.verificationReviewerId
        });
      }

      return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      logger.warn('Error generating verification timeline:', error);
      return [];
    }
  }

  /**
   * Generate verification recommendations
   */
  private generateVerificationRecommendations(verification: VerificationStatus): string[] {
    const recommendations: string[] = [];

    if (verification.isVerified) {
      recommendations.push('Maintain your verification status by keeping documents current');
      recommendations.push('Consider upgrading to premium verification for additional benefits');
      return recommendations;
    }

    const incompleteRequired = verification.requirements.filter(req => req.required && !req.completed);
    const incompleteOptional = verification.requirements.filter(req => !req.required && !req.completed);

    if (incompleteRequired.length > 0) {
      recommendations.push(`Complete ${incompleteRequired.length} required documents to proceed with verification`);
    }

    if (incompleteOptional.length > 0) {
      recommendations.push(`Consider adding ${incompleteOptional.length} optional documents to strengthen your application`);
    }

    if (verification.status === 'rejected') {
      recommendations.push('Review rejection reasons and resubmit with corrected documents');
      recommendations.push('Contact support if you need assistance with the verification process');
    }

    recommendations.push('Ensure all documents are clear, recent, and officially issued');
    recommendations.push('High-quality documents improve approval chances');

    return recommendations;
  }

  /**
   * Validate verification documents
   */
  private validateVerificationDocuments(files: Express.Multer.File[]): void {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new VerificationError(
          `Invalid file type for ${file.originalname}. Allowed: PDF, DOC, DOCX, JPG, PNG, WebP`,
          400,
          'INVALID_FILE_TYPE'
        );
      }

      if (file.size > maxFileSize) {
        throw new VerificationError(
          `File ${file.originalname} exceeds 10MB limit`,
          400,
          'FILE_TOO_LARGE'
        );
      }
    }
  }
}

export const verificationService = new VerificationService();