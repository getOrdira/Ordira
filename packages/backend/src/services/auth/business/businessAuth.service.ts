/**
 * Business Authentication Service
 *
 * Handles all authentication operations specific to business users including
 * registration, verification, login, and password management for business accounts.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';
import { notificationsService } from '../../notifications/notifications.service';
import { Business } from '../../../models/core/business.model';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  RegisterBusinessInput,
  VerifyBusinessInput,
  LoginBusinessInput,
  BusinessAuthResponse,
  BusinessVerificationResponse,
  RegistrationResponse,
  SecurityContext,
  AUTH_CONSTANTS
} from '../types/authTypes.service';

export class BusinessAuthService extends AuthBaseService {
  private notificationsService = notificationsService;

  // ===== BUSINESS REGISTRATION =====

  /**
   * Register a new business account with comprehensive validation
   */
  async registerBusiness(input: RegisterBusinessInput): Promise<RegistrationResponse> {
    const startTime = Date.now();
    const {
      securityContext,
      ...businessData
    } = input;

    const normalizedEmail = UtilsService.normalizeEmail(businessData.email);

    try {
      // Check for existing business
      const existingBusiness = await Business.findOne({ email: normalizedEmail }).lean();
      if (existingBusiness) {
        throw { statusCode: 409, message: 'Email is already registered for a business account.' };
      }

      // Generate verification code (password will be hashed by pre-save hook)
      const emailCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Create business account
      const business = new Business({
        firstName: businessData.firstName,
        lastName: businessData.lastName,
        dateOfBirth: businessData.dateOfBirth instanceof Date
          ? businessData.dateOfBirth
          : new Date(businessData.dateOfBirth),
        email: normalizedEmail,
        password: businessData.password, // Pre-save hook will hash this
        businessName: businessData.businessName,
        businessType: businessData.businessType || 'brand',
        address: businessData.address,
        businessNumber: businessData.businessNumber,
        website: businessData.website,
        marketingConsent: businessData.marketingConsent,
        platformUpdatesConsent: businessData.platformUpdatesConsent,
        emailCode,
        isEmailVerified: false,
        isActive: true,
        tokenVersion: 0
      });

      await business.save();

      // Check if we should skip email verification
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
      const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
      const shouldAutoVerify = isDevelopment || skipEmailVerification;

      // Send verification email (async, don't block registration) - skip if auto-verifying
      let emailSent = false;
      if (!shouldAutoVerify) {
        try {
          await this.notificationsService.sendEmailVerificationCode(normalizedEmail, emailCode, '10 minutes');
          emailSent = true;
        } catch (notificationError: any) {
          logger.warn('Failed to send business verification email', {
            email: UtilsService.maskEmail(normalizedEmail),
            error: notificationError?.message || notificationError
          });
        }
      }

      // Auto-verify email if SKIP_EMAIL_VERIFICATION is enabled or in development/test
      if (shouldAutoVerify) {
        logger.info('Auto-verifying business email due to SKIP_EMAIL_VERIFICATION or development/test environment', {
          email: UtilsService.maskEmail(normalizedEmail),
          businessId: business._id.toString(),
          reason: skipEmailVerification ? 'SKIP_EMAIL_VERIFICATION is enabled' : 'Development/test environment'
        });
        
        // Update business verification status
        await Business.findByIdAndUpdate(business._id, {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          emailCode: undefined
        });
        
        // Reload business to get updated state
        const updatedBusiness = await Business.findById(business._id).lean();
        if (updatedBusiness) {
          business.isEmailVerified = true;
          business.emailVerifiedAt = updatedBusiness.emailVerifiedAt;
          business.emailCode = undefined;
        }
      }

      // Invalidate relevant caches
      await enhancedCacheService.invalidateByTags([
        'business_analytics',
        `business:${business._id.toString()}`
      ]);

      // Log security event
      await this.logSecurityEvent('REGISTER_BUSINESS', normalizedEmail, true, {
        businessId: business._id.toString(),
        securityContext
      });

      const processingTime = Date.now() - startTime;
      logger.info('Business registered successfully', {
        businessId: business._id,
        processingTime
      });

      // Check if email was auto-verified
      const isAutoVerified = shouldAutoVerify;
      
      return {
        businessId: business._id.toString(),
        email: normalizedEmail,
        emailCode: isAutoVerified ? undefined : emailCode,
        verificationRequired: !isAutoVerified
      };

    } catch (error: any) {
      // Log failed registration
      await this.logSecurityEvent('REGISTER_BUSINESS', normalizedEmail, false, {
        reason: error?.message || 'unknown_error',
        securityContext
      });

      logger.error('Business registration failed', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error?.message || error
      });

      throw error;
    }
  }

  // ===== BUSINESS VERIFICATION =====

  /**
   * Verify business email with verification code
   */
  async verifyBusiness(input: VerifyBusinessInput & { securityContext?: SecurityContext }): Promise<BusinessVerificationResponse> {
    const { businessId, emailCode, securityContext } = input;

    try {
      // Find business with verification code
      const business = await Business.findById(businessId)
        .select('+emailCode')
        .lean();

      if (!business) {
        throw { statusCode: 404, message: 'Business not found.' };
      }

      // Check if already verified
      if (business.isEmailVerified) {
        return this.generateBusinessVerificationResponse(business);
      }

      // Validate verification code
      if (business.emailCode !== emailCode) {
        await this.logSecurityEvent('VERIFY_BUSINESS', business.email, false, {
          businessId,
          reason: 'Invalid verification code',
          securityContext
        });
        throw { statusCode: 400, message: 'Invalid verification code.' };
      }

      // Update business to verified status
      const updatedBusiness = await Business.findByIdAndUpdate(
        businessId,
        {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          emailCode: undefined,
          isActive: true
        },
        { new: true }
      ).lean();

      if (!updatedBusiness) {
        throw { statusCode: 500, message: 'Failed to verify business account.' };
      }

      // Invalidate caches
      await enhancedCacheService.invalidateByTags([
        `business:${businessId}`,
        'business_analytics'
      ]);

      // Log successful verification
      await this.logSecurityEvent('VERIFY_BUSINESS', updatedBusiness.email, true, {
        businessId,
        securityContext
      });

      return this.generateBusinessVerificationResponse(updatedBusiness);

    } catch (error: any) {
      logger.error('Business verification failed', {
        businessId,
        error: error?.message || error
      });
      throw error;
    }
  }

  // ===== BUSINESS LOGIN =====

  /**
   * Authenticate business user and generate tokens
   */
  async loginBusiness(input: LoginBusinessInput): Promise<BusinessAuthResponse> {
    const startTime = Date.now();
    const { email, password, rememberMe, securityContext } = input;

    try {
      // Normalize email
      const normalizedEmail = UtilsService.normalizeEmail(email);

      // Find business by email
      // MongoDB will automatically use the best available index for email queries
      const business = await Business.findOne({ email: normalizedEmail })
        .select('+password')
        .lean();

      if (!business) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedEmail, false, {
          reason: 'Business not found',
          securityContext
        });
        throw { statusCode: 404, message: 'Business not found.' };
      }

      // Check if email is verified
      if (!business.isEmailVerified) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedEmail, false, {
          reason: 'Account not verified',
          securityContext
        });
        throw { statusCode: 403, message: 'Account not verified.' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, business.password);
      if (!passwordValid) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedEmail, false, {
          reason: 'Invalid password',
          securityContext
        });
        throw { statusCode: 401, message: 'Invalid credentials.' };
      }

      // Update last login asynchronously
      Business.findByIdAndUpdate(business._id, {
        lastLoginAt: new Date()
      }).exec().catch(error => {
        logger.warn('Failed to update business last login time', {
          businessId: business._id,
          error
        });
      });

      // Generate access token
      const token = this.generateJWTToken({
        sub: business._id.toString(),
        type: 'business',
        email: business.email
      });

      // Generate remember token if requested
      let rememberToken;
      if (rememberMe) {
        rememberToken = this.generateRememberToken({
          sub: business._id.toString(),
          type: 'business_remember',
          email: business.email
        });
      }

      // Cache business data and log success asynchronously
      Promise.all([
        this.logSecurityEvent('LOGIN_BUSINESS', normalizedEmail, true, {
          businessId: business._id,
          securityContext
        }),
        this.cacheUserAfterLogin(business._id.toString(), {
          ...business,
          accountType: 'business',
          lastLoginAt: new Date()
        })
      ]).catch(error => {
        logger.warn('Post-login operations failed', { error });
      });

      const processingTime = Date.now() - startTime;
      logger.info('Business login completed successfully', {
        businessId: business._id,
        processingTime,
        hasRememberToken: !!rememberToken
      });

      return {
        token,
        businessId: business._id.toString(),
        email: business.email,
        businessName: business.businessName,
        isEmailVerified: business.isEmailVerified,
        plan: business.plan,
        rememberToken,
        user: {
          businessId: business._id.toString(),
          email: business.email,
          verified: business.isEmailVerified
        },
        expiresIn: this.JWT_EXPIRES_IN
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Business login failed', {
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // ===== VERIFICATION MANAGEMENT =====

  /**
   * Resend email verification code for business
   */
  async resendBusinessVerification(businessId: string): Promise<void> {
    try {
      // Find business account
      const business = await Business.findById(businessId)
        .select('+emailCode')
        .lean();

      if (!business) {
        throw { statusCode: 404, message: 'Business not found.' };
      }

      if (business.isEmailVerified) {
        throw { statusCode: 400, message: 'Business email is already verified.' };
      }

      // Generate new verification code
      const emailCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Update business with new code
      await Business.findByIdAndUpdate(businessId, {
        emailCode,
        emailVerifiedAt: undefined
      });

      const normalizedEmail = UtilsService.normalizeEmail(business.email);

      // Send verification email
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, emailCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to resend business verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
      }

      // Log resend event
      await this.logSecurityEvent('RESEND_VERIFY_BUSINESS', normalizedEmail, true, {
        businessId
      });

      logger.info('Business verification email resent', {
        businessId,
        email: UtilsService.maskEmail(normalizedEmail)
      });

    } catch (error: any) {
      logger.error('Failed to resend business verification', {
        businessId,
        error: error?.message || error
      });
      throw error;
    }
  }

  // ===== BUSINESS-SPECIFIC UTILITIES =====

  /**
   * Get business by ID with caching
   */
  async getBusinessById(businessId: string, options: { useCache?: boolean } = {}): Promise<any> {
    return this.getOptimizedAccountById(businessId, {
      ...options,
      accountType: 'business'
    });
  }

  /**
   * Validate business-specific requirements
   */
  private validateBusinessData(data: RegisterBusinessInput): void {
    // First name validation
    if (!data.firstName || data.firstName.trim().length < 1) {
      throw { statusCode: 400, message: 'First name is required' };
    }

    // Last name validation
    if (!data.lastName || data.lastName.trim().length < 1) {
      throw { statusCode: 400, message: 'Last name is required' };
    }

    // Business name validation
    if (!data.businessName || data.businessName.trim().length < 2) {
      throw { statusCode: 400, message: 'Business name must be at least 2 characters long' };
    }

    // Marketing consent validation
    if (data.marketingConsent === undefined || typeof data.marketingConsent !== 'boolean') {
      throw { statusCode: 400, message: 'Marketing consent is required' };
    }

    // Platform updates consent validation
    if (data.platformUpdatesConsent === undefined || typeof data.platformUpdatesConsent !== 'boolean') {
      throw { statusCode: 400, message: 'Platform updates consent is required' };
    }
  }

  /**
   * Check business plan limits
   */
  async checkBusinessPlanLimits(businessId: string, action: string): Promise<boolean> {
    try {
      const business = await this.getBusinessById(businessId, { useCache: true });

      if (!business) {
        return false;
      }

      // Plan-specific limits (can be extended)
      const planLimits = {
        foundation: { certificates: 10, analytics: false },
        growth: { certificates: 100, analytics: true },
        premium: { certificates: 1000, analytics: true },
        enterprise: { certificates: Infinity, analytics: true }
      };

      const limits = planLimits[business.plan as keyof typeof planLimits] || planLimits.foundation;

      // Check specific action limits
      switch (action) {
        case 'create_certificate':
          // Would need to count existing certificates
          return true; // Simplified for now
        case 'access_analytics':
          return limits.analytics;
        default:
          return true;
      }

    } catch (error) {
      logger.warn('Failed to check business plan limits', { businessId, action, error });
      return false;
    }
  }

  /**
   * Update business login statistics
   */
  private async updateBusinessLoginStats(businessId: string): Promise<void> {
    try {
      await Business.findByIdAndUpdate(businessId, {
        $inc: { loginCount: 1 },
        lastLoginAt: new Date()
      });
    } catch (error) {
      logger.warn('Failed to update business login stats', { businessId, error });
    }
  }
}

// Export singleton instance
export const businessAuthService = new BusinessAuthService();