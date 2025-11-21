// src/controllers/core/auth.controller.ts
// Authentication controller using modular auth services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from './base.controller';
import { authService } from '../../services/auth';
import { businessAuthService } from '../../services/auth/business/businessAuth.service';
import { manufacturerAuthService } from '../../services/auth/manufacturer/manufacturerAuth.service';

/**
 * Authentication request interfaces
 */
interface LoginRequest extends BaseRequest {
  validatedBody: {
    email: string;
    password: string;
    rememberMe?: boolean;
  };
}

interface RegisterRequest extends BaseRequest {
  validatedBody: {
    accountType: 'user' | 'business' | 'manufacturer';
    email: string;
    password: string;
    // User-specific
    brandSlug?: string;
    // Business/Manufacturer fields
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | Date;
    businessName?: string;
    businessType?: 'brand' | 'creator';
    address?: string;
    businessNumber?: string;
    website?: string;
    // Manufacturer-specific
    industry?: string;
    // Marketing consents
    marketingConsent?: boolean;
    platformUpdatesConsent?: boolean;
  };
}

interface VerifyRequest extends BaseRequest {
  validatedBody: {
    email: string;
    code: string;
  };
}

interface ForgotPasswordRequest extends BaseRequest {
  validatedBody: {
    email?: string;
  };
}

interface ResetPasswordRequest extends BaseRequest {
  validatedBody: {
    token: string;
    newPassword: string;
    confirmPassword?: string;
  };
}

interface ResendVerificationRequest extends BaseRequest {
  validatedBody: {
    email: string;
  };
}

/**
 * Authentication controller
 */
export class AuthController extends BaseController {
  /**
   * POST /api/auth/login
   * User login endpoint
   */
  async login(req: LoginRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log login attempt without password - logSafe will sanitize if password somehow included
      this.logAction(req, 'LOGIN_ATTEMPT', {
        email: req.validatedBody.email,
        rememberMe: req.validatedBody.rememberMe
        // password is NEVER logged - only email and rememberMe flag
      });

      const result = await authService.loginUser({
        email: req.validatedBody.email,
        password: req.validatedBody.password,
        rememberMe: req.validatedBody.rememberMe || false,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing tokens
      this.logAction(req, 'LOGIN_SUCCESS', {
        userId: result.userId,
        email: result.email,
        isEmailVerified: result.isEmailVerified
        // tokens are NEVER logged
      });

      return {
        user: {
          id: result.userId,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          isEmailVerified: result.isEmailVerified,
          preferences: result.preferences
        },
        token: result.token,
        rememberToken: result.rememberToken
      };
    }, res, 'Login successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/register
   * Unified registration endpoint for all account types (user, business, manufacturer)
   */
  async register(req: RegisterRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      const { accountType, email, password, brandSlug, firstName, lastName, businessName, businessType, dateOfBirth, address, businessNumber, website, industry, marketingConsent, platformUpdatesConsent } = req.validatedBody;

      // Log registration attempt without password
      this.logAction(req, 'REGISTER_ATTEMPT', {
        accountType,
        email
        // password is NEVER logged
      });

      let result;
      let responseData;

      switch (accountType) {
        case 'user': {
          // Frontend user registration (for voting on brand domains)
          result = await authService.registerUser({
            email,
            password,
            brandSlug,
            securityContext: {
              ipAddress: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown'
            }
          });

          responseData = {
            accountType: 'user',
            user: {
              id: result.userId,
              email: result.email
            },
            message: 'Registration successful. Please check your email for verification.',
            verificationRequired: result.verificationRequired
          };
          break;
        }

        case 'business': {
          // Business/Creator registration
          if (!firstName || !lastName || !businessName || !dateOfBirth || !address || marketingConsent === undefined || platformUpdatesConsent === undefined) {
            throw { statusCode: 400, message: 'Missing required fields for business registration' };
          }

          result = await businessAuthService.registerBusiness({
            email,
            password,
            firstName,
            lastName,
            dateOfBirth: new Date(dateOfBirth),
            businessName,
            businessType: businessType || 'brand',
            address,
            businessNumber,
            website,
            marketingConsent,
            platformUpdatesConsent,
            securityContext: {
              ipAddress: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown'
            }
          });

          responseData = {
            accountType: 'business',
            business: {
              id: result.businessId,
              email: result.email,
              businessName
            },
            message: 'Business registration successful. Please check your email for verification.',
            verificationRequired: result.verificationRequired
          };
          break;
        }

        case 'manufacturer': {
          // Manufacturer registration
          if (!firstName || !lastName || !businessName || !dateOfBirth || !address || !industry || marketingConsent === undefined || platformUpdatesConsent === undefined) {
            throw { statusCode: 400, message: 'Missing required fields for manufacturer registration' };
          }

          result = await manufacturerAuthService.registerManufacturer({
            email,
            password,
            firstName,
            lastName,
            dateOfBirth: new Date(dateOfBirth),
            businessName,
            address,
            businessNumber,
            industry,
            website,
            marketingConsent,
            platformUpdatesConsent,
            securityContext: {
              ipAddress: req.ip || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown'
            }
          });

          responseData = {
            accountType: 'manufacturer',
            manufacturer: {
              id: result.manufacturerId,
              email: result.email,
              businessName
            },
            message: 'Manufacturer registration successful. Please check your email for verification.',
            verificationRequired: result.verificationRequired
          };
          break;
        }

        default:
          throw { statusCode: 400, message: 'Invalid account type' };
      }

      // Log success without exposing verification code
      const accountId = result.userId || result.businessId || result.manufacturerId;
      this.logAction(req, 'REGISTER_SUCCESS', {
        accountType,
        accountId,
        email: result.email,
        verificationRequired: result.verificationRequired
        // verificationCode is NEVER logged
      });

      return responseData;
    }, res, 'Registration successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/verify
   * Email verification endpoint
   */
  async verify(req: VerifyRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log verification attempt without code
      this.logAction(req, 'VERIFY_ATTEMPT', {
        email: req.validatedBody.email
      });

      const result = await authService.verifyUser({
        email: req.validatedBody.email,
        code: req.validatedBody.code,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing token
      this.logAction(req, 'VERIFY_SUCCESS', {
        userId: result.userId,
        email: result.email
        // token is NEVER logged
      });

      return {
        user: {
          id: result.userId,
          email: result.email
        },
        token: result.token
      };
    }, res, 'Email verification successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/forgot-password
   * Forgot password endpoint
   */
  async forgotPassword(req: ForgotPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'FORGOT_PASSWORD_ATTEMPT', {
        email: req.validatedBody.email
      });

      await authService.requestPasswordReset({
        email: req.validatedBody.email,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      this.logAction(req, 'FORGOT_PASSWORD_SUCCESS', {
        email: req.validatedBody.email
      });

      return {
        message: 'Password reset email sent successfully'
      };
    }, res, 'Password reset email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/reset-password
   * Reset password endpoint
   */
  async resetPassword(req: ResetPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log reset attempt without token or password
      this.logAction(req, 'RESET_PASSWORD_ATTEMPT');
      // token and newPassword are NEVER logged

      await authService.confirmPasswordReset({
        token: req.validatedBody.token,
        newPassword: req.validatedBody.newPassword,
        confirmPassword: req.validatedBody.confirmPassword,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success - we can't know userId from token without lookup
      this.logAction(req, 'RESET_PASSWORD_SUCCESS');

      return {
        message: 'Password reset successful'
      };
    }, res, 'Password reset successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/resend-verification
   * Resend verification email endpoint
   */
  async resendVerification(req: ResendVerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'RESEND_VERIFICATION_ATTEMPT', {
        email: req.validatedBody.email
      });

      await authService.resendUserVerification(req.validatedBody.email);

      this.logAction(req, 'RESEND_VERIFICATION_SUCCESS', {
        email: req.validatedBody.email
      });

      return {
        message: 'Verification email sent successfully'
      };
    }, res, 'Verification email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/logout
   * User logout endpoint
   */
  async logout(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'LOGOUT_ATTEMPT', {
        userId: req.userId
      });

      // Clear auth cache on logout
      if (req.userId) {
        await authService.clearAuthCache(req.userId, 'user');
      }

      this.logAction(req, 'LOGOUT_SUCCESS', {
        userId: req.userId
      });

      return {
        message: 'Logout successful'
      };
    }, res, 'Logout successful', this.getRequestMeta(req));
  }

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  async getProfile(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_USER_PROFILE');

      const user = await authService.getUserById(req.userId!, {
        useCache: true
      });

      this.logAction(req, 'GET_PROFILE_SUCCESS', {
        userId: req.userId
        // user data is returned but not logged (could contain sensitive info)
      });

      return { user };
    }, res, 'Profile retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const authController = new AuthController();
