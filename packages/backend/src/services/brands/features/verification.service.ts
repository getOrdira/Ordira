// src/services/brands/features/verification.service.ts
import { Business } from '../../../models/deprecated/business.model';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';

export interface VerificationStatus {
  email: {
    verified: boolean;
    verifiedAt: Date | null;
  };
  phone: {
    verified: boolean;
    verifiedAt: Date | null;
  };
  business: {
    verified: boolean;
    verifiedAt: Date | null;
    documents: any[];
  };
  wallet: {
    verified: boolean;
    verifiedAt: Date | null;
    address: string | null;
  };
  overallStatus: string;
}

export interface VerificationSubmissionData {
  type: 'business' | 'identity' | 'wallet';
  documents?: any[];
  additionalInfo?: any;
}

export interface VerificationSubmissionResult {
  verificationId: string;
  status: string;
  submittedAt: Date;
  estimatedReviewTime: string;
  nextSteps: string[];
}

export interface DetailedVerificationStatus extends VerificationStatus {
  history: any[];
  pending: any[];
  requirements: any;
  tips: string[];
}

export class VerificationService {

  /**
   * Get verification status for a business
   */
  async getVerificationStatus(businessId: string): Promise<VerificationStatus> {
    try {
      const business = await Business.findById(businessId).select('isEmailVerified isPhoneVerified emailVerifiedAt phoneVerifiedAt');
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

  /**
   * Submit verification request
   */
  async submitVerification(businessId: string, verificationData: VerificationSubmissionData): Promise<VerificationSubmissionResult> {
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

      // Store verification request
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

  /**
   * Get detailed verification status with history and requirements
   */
  async getDetailedVerificationStatus(businessId: string): Promise<DetailedVerificationStatus> {
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

  /**
   * Get verification history for a business
   */
  async getVerificationHistory(businessId: string): Promise<any[]> {
    try {
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

      if (brandSettings?.web3Settings?.walletVerified) {
        history.push({
          type: 'wallet',
          status: 'verified',
          completedAt: brandSettings.web3Settings.walletVerifiedAt,
          method: 'signature_verification'
        });
      }

      return history.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    } catch (error) {
      logger.error('Error getting verification history:', error);
      return [];
    }
  }

  /**
   * Verify email for a business
   */
  async verifyEmail(businessId: string, verificationCode: string): Promise<{
    verified: boolean;
    message: string;
  }> {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      if (business.isEmailVerified) {
        return {
          verified: true,
          message: 'Email is already verified'
        };
      }

      if (!verificationCode || verificationCode.length < 6) {
        return {
          verified: false,
          message: 'Invalid verification code'
        };
      }

      // Update verification status
      await Business.updateOne(
        { _id: businessId },
        {
          $set: {
            isEmailVerified: true,
            emailVerifiedAt: new Date()
          }
        }
      );

      logger.info(`Email verified for business: ${businessId}`);

      return {
        verified: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(businessId: string): Promise<{
    sent: boolean;
    message: string;
    expiresAt?: Date;
  }> {
    try {
      const business = await Business.findById(businessId);
      if (!business) {
        throw { statusCode: 404, message: 'Business not found' };
      }

      if (business.isEmailVerified) {
        return {
          sent: false,
          message: 'Email is already verified'
        };
      }

      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await Business.updateOne(
        { _id: businessId },
        {
          $set: {
            emailVerificationCode: verificationCode,
            emailVerificationExpires: expiresAt
          }
        }
      );

      logger.info(`Email verification sent to business: ${businessId}`);

      return {
        sent: true,
        message: 'Verification email sent successfully',
        expiresAt
      };
    } catch (error) {
      logger.error('Error sending email verification:', error);
      throw error;
    }
  }

  /**
   * Update business verification status (admin function)
   */
  async updateBusinessVerificationStatus(
    businessId: string,
    status: 'pending' | 'verified' | 'rejected',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        businessVerificationStatus: status,
        businessVerificationReviewedAt: new Date(),
        businessVerificationReviewedBy: reviewedBy
      };

      if (status === 'verified') {
        updateData.businessVerified = true;
        updateData.businessVerifiedAt = new Date();
      }

      if (notes) {
        updateData.businessVerificationNotes = notes;
      }

      await BrandSettings.updateOne(
        { business: businessId },
        { $set: updateData },
        { upsert: true }
      );

      await this.notifyBusinessOfVerificationUpdate(businessId, status);
      logger.info(`Business verification status updated: ${businessId} -> ${status}`);
    } catch (error) {
      logger.error('Error updating business verification status:', error);
      throw error;
    }
  }

  /**
   * Get verification statistics for analytics
   */
  async getVerificationStatistics(businessId?: string): Promise<{
    totalVerifications: number;
    emailVerifications: number;
    businessVerifications: number;
    walletVerifications: number;
    pendingVerifications: number;
  }> {
    try {
      const query = businessId ? { _id: businessId } : {};

      const [emailStats, businessStats] = await Promise.all([
        Business.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              emailVerified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
              phoneVerified: { $sum: { $cond: ['$isPhoneVerified', 1, 0] } }
            }
          }
        ]),
        BrandSettings.aggregate([
          ...(businessId ? [{ $match: { business: businessId } }] : []),
          {
            $group: {
              _id: null,
              businessVerified: { $sum: { $cond: ['$businessVerified', 1, 0] } },
              walletVerified: {
                $sum: { $cond: ['$web3Settings.walletVerified', 1, 0] }
              }
            }
          }
        ])
      ]);

      const emailData = emailStats[0] || { total: 0, emailVerified: 0, phoneVerified: 0 };
      const businessData = businessStats[0] || { businessVerified: 0, walletVerified: 0 };

      return {
        totalVerifications: emailData.total,
        emailVerifications: emailData.emailVerified,
        businessVerifications: businessData.businessVerified,
        walletVerifications: businessData.walletVerified,
        pendingVerifications: 0
      };
    } catch (error) {
      logger.error('Error getting verification statistics:', error);
      return {
        totalVerifications: 0,
        emailVerifications: 0,
        businessVerifications: 0,
        walletVerifications: 0,
        pendingVerifications: 0
      };
    }
  }

  /**
   * Calculate overall verification status
   */
  private calculateOverallVerificationStatus(business: any, brandSettings: any): string {
    const emailVerified = business.isEmailVerified;
    const phoneVerified = business.isPhoneVerified || false;
    const businessVerified = brandSettings?.businessVerified || false;
    const walletVerified = brandSettings?.web3Settings?.walletVerified || false;

    if (emailVerified && businessVerified && walletVerified) return 'fully_verified';
    if (emailVerified && businessVerified) return 'business_verified';
    if (emailVerified && phoneVerified) return 'contact_verified';
    if (emailVerified) return 'email_verified';
    return 'unverified';
  }

  /**
   * Get verification requirements
   */
  private getVerificationRequirements(): any {
    return {
      email: ['Valid email address', 'Click verification link sent to email'],
      phone: ['Valid phone number', 'Enter SMS verification code'],
      business: [
        'Business registration documents',
        'Tax ID certificate',
        'Proof of address',
        'Valid business license'
      ],
      wallet: [
        'Connect Web3 wallet',
        'Sign verification message',
        'Confirm wallet ownership'
      ]
    };
  }

  /**
   * Get verification tips
   */
  private getVerificationTips(): string[] {
    return [
      'Ensure all documents are clear and legible',
      'Use recent documents (within 3 months for address proof)',
      'Make sure your name matches across all documents',
      'Contact support if you need help with any step',
      'Business verification typically takes 3-5 business days'
    ];
  }

  /**
   * Get next steps for verification type
   */
  private getVerificationNextSteps(type: string): string[] {
    const steps = {
      business: [
        'Wait for document review by our team',
        'Check your email for updates on verification status',
        'Respond promptly to any requests for additional information'
      ],
      identity: [
        'Provide clear photos of government-issued ID',
        'Take a verification selfie as instructed',
        'Wait for manual review process'
      ],
      wallet: [
        'Sign the verification message with your wallet',
        'Confirm wallet ownership through signature verification',
        'Keep your wallet accessible for future transactions'
      ]
    };

    return steps[type as keyof typeof steps] || ['Contact support for assistance'];
  }

  /**
   * Create verification record
   */
  private async createVerificationRecord(verification: any): Promise<any> {
    const verificationId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Verification record created', {
      verificationId,
      businessId: verification.businessId,
      type: verification.type
    });

    return {
      id: verificationId,
      ...verification
    };
  }

  /**
   * Notify admins of verification submission
   */
  private async notifyAdminsOfVerificationSubmission(businessId: string, type: string): Promise<void> {
    logger.info(`New ${type} verification submitted for business: ${businessId}`);
  }

  /**
   * Notify business of verification update
   */
  private async notifyBusinessOfVerificationUpdate(businessId: string, status: string): Promise<void> {
    logger.info(`Verification status updated for business ${businessId}: ${status}`);
  }

  /**
   * Get pending verifications
   */
  private async getPendingVerifications(businessId: string): Promise<any[]> {
    return [];
  }

  /**
   * Generate email verification code
   */
  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Check if verification is expired
   */
  isVerificationExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}
