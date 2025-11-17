/**
 * User Authentication Service
 *
 * Handles all authentication operations specific to frontend users including
 * registration, verification, login with email gating integration and
 * business context support.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../../../utils/logger';
import { UtilsService } from '../../infrastructure/shared';
import { notificationsService } from '../../notifications/notifications.service';
import { User } from '../../../models/core/user.model';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';
import { customerAccessService } from '../../brands';

// Import base service and types
import { AuthBaseService } from '../base/authBase.service';
import {
  RegisterUserInput,
  VerifyUserInput,
  LoginUserInput,
  UserAuthResponse,
  UserVerificationResponse,
  RegistrationResponse,
  SecurityContext,
  AUTH_CONSTANTS
} from '../types/authTypes.service';

export class UserAuthService extends AuthBaseService {
  private notificationsService = notificationsService;
  private customerAccessService = customerAccessService;

  // ===== USER REGISTRATION =====

  /**
   * Register a new user account with comprehensive validation
   */
  async registerUser(input: RegisterUserInput): Promise<RegistrationResponse> {
    const startTime = Date.now();
    const {
      securityContext,
      preferences,
      ...userData
    } = input;

    const normalizedEmail = UtilsService.normalizeEmail(userData.email);

    try {
      // Check for existing user
      const existingUser = await User.findOne({ email: normalizedEmail }).lean();
      if (existingUser) {
        throw { statusCode: 409, message: 'Email is already registered.' };
      }

      // Hash password and generate verification code
      const passwordHash = await bcrypt.hash(userData.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
      const emailCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Create user account
      const user = new User({
        ...userData,
        email: normalizedEmail,
        password: passwordHash,
        emailCode,
        isEmailVerified: false,
        status: 'active',
        preferences: {
          emailNotifications: preferences?.emailNotifications ?? true,
          smsNotifications: preferences?.smsNotifications ?? false,
          marketingEmails: preferences?.marketingEmails ?? true,
          language: preferences?.language ?? 'en',
          timezone: preferences?.timezone ?? 'UTC'
        }
      });

      await user.save();

      // Invalidate relevant caches
      await enhancedCacheService.invalidateByTags([
        'user_analytics'
      ]);

      // Send verification email (async, don't block registration)
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, emailCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to send user verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
      }

      // Log security event
      await this.logSecurityEvent('REGISTER_USER', normalizedEmail, true, {
        userId: user._id.toString(),
        businessId: userData.businessId,
        securityContext
      });

      const processingTime = Date.now() - startTime;
      logger.info('User registered successfully', {
        userId: user._id,
        processingTime
      });

      return {
        userId: user._id.toString(),
        email: normalizedEmail,
        emailCode,
        verificationRequired: true
      };

    } catch (error: any) {
      // Log failed registration
      await this.logSecurityEvent('REGISTER_USER', normalizedEmail, false, {
        reason: error?.message || 'unknown_error',
        securityContext
      });

      logger.error('User registration failed', {
        email: UtilsService.maskEmail(normalizedEmail),
        error: error?.message || error
      });

      throw error;
    }
  }

  // ===== USER VERIFICATION =====

  /**
   * Verify user email with verification code
   */
  async verifyUser(input: VerifyUserInput & { securityContext?: SecurityContext }): Promise<UserVerificationResponse> {
    const { email, code, securityContext } = input;
    const normalizedEmail = UtilsService.normalizeEmail(email);

    try {
      // Find user with verification code
      const user = await User.findOne({ email: normalizedEmail })
        .select('+emailCode')
        .lean();

      if (!user) {
        throw { statusCode: 404, message: 'User not found.' };
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return this.generateUserVerificationResponse(user);
      }

      // Validate verification code
      if (user.emailCode !== code) {
        await this.logSecurityEvent('VERIFY_USER', normalizedEmail, false, {
          reason: 'Invalid verification code',
          securityContext
        });
        throw { statusCode: 400, message: 'Invalid verification code.' };
      }

      // Update user to verified status
      const updatedUser = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          emailCode: undefined,
          status: 'active'
        },
        { new: true }
      ).lean();

      if (!updatedUser) {
        throw { statusCode: 500, message: 'Failed to verify user account.' };
      }

      // Invalidate caches
      await enhancedCacheService.invalidateByTags([
        `user:${updatedUser._id.toString()}`,
        'user_analytics'
      ]);

      // Log successful verification
      await this.logSecurityEvent('VERIFY_USER', normalizedEmail, true, {
        userId: updatedUser._id.toString(),
        securityContext
      });

      return this.generateUserVerificationResponse(updatedUser);

    } catch (error: any) {
      logger.error('User verification failed', {
        email: UtilsService.maskEmail(email),
        error: error?.message || error
      });
      throw error;
    }
  }

  // ===== USER LOGIN =====

  /**
   * Authenticate user with email gating and business context support
   */
  async loginUser(input: LoginUserInput): Promise<UserAuthResponse> {
    const startTime = Date.now();
    const { email, password, rememberMe, businessId, securityContext } = input;

    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);

      // Get user with password (bypassing cache for security)
      const user = await User.findOne({ email: normalizedEmail })
        .select('+password')
        .lean()
        .hint('email_1');

      if (!user) {
        await this.logSecurityEvent('LOGIN_USER', normalizedEmail, false, {
          reason: 'User not found',
          securityContext
        });
        throw { statusCode: 404, message: 'User not found.' };
      }

      if (!user.isEmailVerified) {
        await this.logSecurityEvent('LOGIN_USER', normalizedEmail, false, {
          reason: 'Email not verified',
          securityContext
        });
        throw { statusCode: 403, message: 'Email not verified.' };
      }

      // Verify password (no caching for security)
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        await this.logSecurityEvent('LOGIN_USER', normalizedEmail, false, {
          reason: 'Invalid password',
          securityContext
        });
        throw { statusCode: 401, message: 'Invalid credentials.' };
      }

      // Check email gating if business context provided
      let emailGatingInfo;
      if (businessId) {
        const emailCheck = await this.customerAccessService.isEmailAllowed(normalizedEmail, businessId);
        emailGatingInfo = emailCheck;

        if (!emailCheck.allowed) {
          await this.logSecurityEvent('LOGIN_USER_EMAIL_GATING_DENIED', normalizedEmail, false, {
            businessId,
            reason: emailCheck.reason,
            securityContext
          });
          throw {
            statusCode: 403,
            message: emailCheck.reason || 'Email not authorized for this voting platform.',
            code: 'EMAIL_ACCESS_DENIED'
          };
        }

        // Record voting access asynchronously
        this.customerAccessService.grantVotingAccess(normalizedEmail, businessId, user._id.toString())
          .catch(error => logger.warn('Failed to grant voting access', { error }));
      }

      // Update last login asynchronously
      User.findByIdAndUpdate(user._id, {
        lastLoginAt: new Date()
      }).exec().catch(error => {
        logger.warn('Failed to update user last login time', { userId: user._id, error });
      });

      // Generate access token
      const token = this.generateJWTToken({
        sub: user._id.toString(),
        type: 'user',
        email: user.email
      });

      // Generate remember token if requested
      let rememberToken;
      if (rememberMe) {
        rememberToken = this.generateRememberToken({
          sub: user._id.toString(),
          type: 'user_remember',
          email: user.email
        });
      }

      // Log successful login and cache user data asynchronously
      Promise.all([
        this.logSecurityEvent('LOGIN_USER', normalizedEmail, true, {
          userId: user._id,
          businessId,
          securityContext
        }),
        this.cacheUserAfterLogin(user._id.toString(), {
          ...user,
          accountType: 'user',
          lastLoginAt: new Date()
        })
      ]).catch(error => {
        logger.warn('Post-login operations failed', { error });
      });

      const processingTime = Date.now() - startTime;
      logger.info('User login completed successfully', {
        userId: user._id,
        processingTime,
        hasBusinessContext: !!businessId,
        hasRememberToken: !!rememberToken
      });

      return {
        token,
        userId: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        preferences: user.preferences || {},
        rememberToken,
        emailGating: emailGatingInfo
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('User login failed', {
        email: UtilsService.maskEmail(email),
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // ===== VERIFICATION MANAGEMENT =====

  /**
   * Resend email verification code for user
   */
  async resendUserVerification(email: string): Promise<void> {
    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);

      // Find user account
      const user = await User.findOne({ email: normalizedEmail })
        .select('+emailCode')
        .lean();

      if (!user) {
        throw { statusCode: 404, message: 'User not found.' };
      }

      if (user.isEmailVerified) {
        throw { statusCode: 400, message: 'Email is already verified.' };
      }

      // Generate new verification code
      const emailCode = UtilsService.generateNumericCode(AUTH_CONSTANTS.EMAIL_VERIFICATION_CODE_LENGTH);

      // Update user with new code
      await User.updateOne({ email: normalizedEmail }, {
        emailCode,
        emailVerifiedAt: undefined
      });

      // Send verification email
      try {
        await this.notificationsService.sendEmailVerificationCode(normalizedEmail, emailCode, '10 minutes');
      } catch (notificationError: any) {
        logger.warn('Failed to resend user verification email', {
          email: UtilsService.maskEmail(normalizedEmail),
          error: notificationError?.message || notificationError
        });
      }

      // Log resend event
      await this.logSecurityEvent('RESEND_VERIFY_USER', normalizedEmail, true);

      logger.info('User verification email resent', {
        email: UtilsService.maskEmail(normalizedEmail)
      });

    } catch (error: any) {
      logger.error('Failed to resend user verification', {
        email: UtilsService.maskEmail(email),
        error: error?.message || error
      });
      throw error;
    }
  }

  // ===== USER-SPECIFIC UTILITIES =====

  /**
   * Get user by ID with caching
   */
  async getUserById(userId: string, options: { useCache?: boolean } = {}): Promise<any> {
    return this.getOptimizedAccountById(userId, {
      ...options,
      accountType: 'user'
    });
  }

  /**
   * Generate verification response for user
   */
  generateUserVerificationResponse(user: any): UserVerificationResponse {
    const userId = user._id?.toString() || user.id;
    const token = this.generateJWTToken({
      sub: userId,
      type: 'user',
      email: user.email
    });

    return {
      token,
      userId,
      email: user.email
    };
  }

  /**
   * Validate user registration data
   */
  private validateUserData(data: RegisterUserInput): void {
    // Email validation
    if (!UtilsService.isValidEmail(data.email)) {
      throw { statusCode: 400, message: 'Please provide a valid email address' };
    }

    // Password validation
    if (!data.password || data.password.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
      throw { statusCode: 400, message: `Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters long` };
    }

    // Optional name validation
    if (data.firstName && data.firstName.trim().length < 1) {
      throw { statusCode: 400, message: 'First name cannot be empty if provided' };
    }

    if (data.lastName && data.lastName.trim().length < 1) {
      throw { statusCode: 400, message: 'Last name cannot be empty if provided' };
    }
  }

  /**
   * Check if user has email gating access for business
   */
  async checkEmailGatingAccess(email: string, businessId: string): Promise<{
    allowed: boolean;
    reason?: string;
    details?: any;
  }> {
    try {
      const normalizedEmail = UtilsService.normalizeEmail(email);
      return await this.customerAccessService.isEmailAllowed(normalizedEmail, businessId);
    } catch (error) {
      logger.warn('Failed to check email gating access', { email: UtilsService.maskEmail(email), businessId, error });
      return {
        allowed: false,
        reason: 'Unable to verify email access'
      };
    }
  }

  /**
   * Update user login statistics
   */
  private async updateUserLoginStats(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { loginCount: 1 },
        lastLoginAt: new Date()
      });
    } catch (error) {
      logger.warn('Failed to update user login stats', { userId, error });
    }
  }
}

// Export singleton instance
export const userAuthService = new UserAuthService();