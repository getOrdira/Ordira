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
import { Business } from '../../../models/deprecated/business.model';
import { enhancedCacheService } from '../../external/enhanced-cache.service';

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
    const normalizedPhone = businessData.phone ? UtilsService.normalizePhone(businessData.phone) : undefined;

    try {
      // Check for existing business
      const existingBusiness = await Business.findOne({ email: normalizedEmail }).lean();
      if (existingBusiness) {
        throw { statusCode: 409, message: 'Email is already registered for a business account.' };
      }

      // Hash password and generate verification code
      const passwordHash = await bcrypt.hash(businessData.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
      const emailCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Create business account
      const business = new Business({
        ...businessData,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: passwordHash,
        emailCode,
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: true,
        tokenVersion: 0
      });

      await business.save();

      // Send verification email (async, don't block registration)
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, emailCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to send business verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
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

      return {
        businessId: business._id.toString(),
        email: normalizedEmail,
        emailCode,
        verificationRequired: true
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
    const { emailOrPhone, password, rememberMe, securityContext } = input;

    try {
      // Normalize input (email or phone)
      const normalizedInput = UtilsService.isValidEmail(emailOrPhone)
        ? UtilsService.normalizeEmail(emailOrPhone)
        : UtilsService.normalizePhone(emailOrPhone);

      // Find business by email or phone
      const business = await Business.findOne({
        $or: [
          { email: normalizedInput },
          { phone: normalizedInput }
        ]
      })
        .select('+password')
        .lean()
        .hint('email_phone_composite_1');

      if (!business) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, {
          reason: 'Business not found',
          securityContext
        });
        throw { statusCode: 404, message: 'Business not found.' };
      }

      // Check if email is verified
      if (!business.isEmailVerified) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, {
          reason: 'Account not verified',
          securityContext
        });
        throw { statusCode: 403, message: 'Account not verified.' };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, business.password);
      if (!passwordValid) {
        await this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, false, {
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
        this.logSecurityEvent('LOGIN_BUSINESS', normalizedInput, true, {
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
    // Business name validation
    if (!data.businessName || data.businessName.trim().length < 2) {
      throw { statusCode: 400, message: 'Business name must be at least 2 characters long' };
    }

    // Business type validation
    if (!['brand', 'creator'].includes(data.businessType)) {
      throw { statusCode: 400, message: 'Business type must be either "brand" or "creator"' };
    }

    // Age validation for business registration
    const age = Math.floor((Date.now() - new Date(data.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      throw { statusCode: 400, message: 'You must be at least 18 years old to register a business' };
    }

    // Address validation
    if (!data.address || data.address.trim().length < 10) {
      throw { statusCode: 400, message: 'Please provide a complete business address' };
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