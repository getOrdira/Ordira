// src/controllers/core/businessAuth.controller.ts
// Business authentication controller

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from './base.controller';
import { businessAuthService } from '../../services/auth/business/businessAuth.service';
import { passwordResetService } from '../../services/auth/shared/passwordReset.service';
import { authService } from '../../services/auth';

/**
 * Business authentication request interfaces
 */
interface RegisterBusinessRequest extends BaseRequest {
  validatedBody: {
    firstName: string;
    lastName: string;
    dateOfBirth: string | Date;
    businessName: string;
    businessType?: 'brand' | 'creator';
    address: string;
    businessNumber?: string;
    email: string;
    password: string;
    website?: string;
    marketingConsent: boolean;
    platformUpdatesConsent: boolean;
  };
}

interface LoginBusinessRequest extends BaseRequest {
  validatedBody: {
    email: string;
    password: string;
    rememberMe?: boolean;
  };
}

interface VerifyBusinessRequest extends BaseRequest {
  validatedBody: {
    businessId: string;
    emailCode: string;
  };
}

interface ForgotPasswordRequest extends BaseRequest {
  validatedBody: {
    email: string;
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
    businessId: string;
  };
}

/**
 * Business authentication controller
 */
export class BusinessAuthController extends BaseController {
  /**
   * POST /api/auth/business/register
   * Business registration endpoint
   */
  async register(req: RegisterBusinessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log registration attempt without password
      this.logAction(req, 'BUSINESS_REGISTER_ATTEMPT', {
        email: req.validatedBody.email,
        businessName: req.validatedBody.businessName
        // password is NEVER logged
      });

      const result = await businessAuthService.registerBusiness({
        email: req.validatedBody.email,
        password: req.validatedBody.password,
        businessName: req.validatedBody.businessName,
        firstName: req.validatedBody.firstName,
        lastName: req.validatedBody.lastName,
        dateOfBirth: req.validatedBody.dateOfBirth instanceof Date 
          ? req.validatedBody.dateOfBirth 
          : new Date(req.validatedBody.dateOfBirth),
        businessType: req.validatedBody.businessType || 'brand',
        address: req.validatedBody.address,
        businessNumber: req.validatedBody.businessNumber,
        website: req.validatedBody.website,
        marketingConsent: req.validatedBody.marketingConsent,
        platformUpdatesConsent: req.validatedBody.platformUpdatesConsent,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing verification code
      this.logAction(req, 'BUSINESS_REGISTER_SUCCESS', {
        businessId: result.businessId,
        email: result.email,
        verificationRequired: result.verificationRequired
        // verificationCode is NEVER logged
      });

      return {
        business: {
          id: result.businessId,
          email: result.email,
          businessName: req.validatedBody.businessName
        },
        message: 'Business registration successful. Please check your email for verification.',
        verificationRequired: result.verificationRequired
      };
    }, res, 'Business registration successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/login
   * Business login endpoint
   */
  async login(req: LoginBusinessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log login attempt without password
      this.logAction(req, 'BUSINESS_LOGIN_ATTEMPT', {
        email: req.validatedBody.email,
        rememberMe: req.validatedBody.rememberMe
        // password is NEVER logged
      });

      const result = await businessAuthService.loginBusiness({
        email: req.validatedBody.email,
        password: req.validatedBody.password,
        rememberMe: req.validatedBody.rememberMe || false,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing tokens
      this.logAction(req, 'BUSINESS_LOGIN_SUCCESS', {
        businessId: result.businessId,
        email: result.email,
        businessName: result.businessName
        // tokens are NEVER logged
      });

      return {
        business: {
          id: result.businessId,
          email: result.email,
          businessName: result.businessName,
          isEmailVerified: result.isEmailVerified,
          plan: result.plan
        },
        token: result.token,
        rememberToken: result.rememberToken
      };
    }, res, 'Business login successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/verify
   * Business email verification endpoint
   */
  async verify(req: VerifyBusinessRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log verification attempt without code
      this.logAction(req, 'BUSINESS_VERIFY_ATTEMPT', {
        businessId: req.validatedBody.businessId
      });

      const result = await businessAuthService.verifyBusiness({
        businessId: req.validatedBody.businessId,
        emailCode: req.validatedBody.emailCode,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing token
      this.logAction(req, 'BUSINESS_VERIFY_SUCCESS', {
        businessId: result.businessId,
        email: result.email
        // token is NEVER logged
      });

      return {
        business: {
          id: result.businessId,
          email: result.email
        },
        token: result.token
      };
    }, res, 'Business email verification successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/forgot-password
   * Forgot password endpoint
   */
  async forgotPassword(req: ForgotPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'BUSINESS_FORGOT_PASSWORD_ATTEMPT', {
        email: req.validatedBody.email
      });

      await passwordResetService.initiatePasswordReset({
        email: req.validatedBody.email,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      this.logAction(req, 'BUSINESS_FORGOT_PASSWORD_SUCCESS', {
        email: req.validatedBody.email
      });

      return {
        message: 'Password reset email sent successfully'
      };
    }, res, 'Password reset email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/reset-password
   * Reset password endpoint
   */
  async resetPassword(req: ResetPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log reset attempt without token or password
      this.logAction(req, 'BUSINESS_RESET_PASSWORD_ATTEMPT');
      // token and newPassword are NEVER logged

      await passwordResetService.confirmPasswordReset({
        token: req.validatedBody.token,
        newPassword: req.validatedBody.newPassword,
        confirmPassword: req.validatedBody.confirmPassword,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success
      this.logAction(req, 'BUSINESS_RESET_PASSWORD_SUCCESS');

      return {
        message: 'Password reset successful'
      };
    }, res, 'Password reset successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/resend-verification
   * Resend verification email endpoint
   */
  async resendVerification(req: ResendVerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'BUSINESS_RESEND_VERIFICATION_ATTEMPT', {
        businessId: req.validatedBody.businessId
      });

      await businessAuthService.resendBusinessVerification(req.validatedBody.businessId);

      this.logAction(req, 'BUSINESS_RESEND_VERIFICATION_SUCCESS', {
        businessId: req.validatedBody.businessId
      });

      return {
        message: 'Verification email sent successfully'
      };
    }, res, 'Verification email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/business/logout
   * Business logout endpoint
   */
  async logout(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'BUSINESS_LOGOUT_ATTEMPT', {
        businessId: req.userId
      });

      // Clear auth cache on logout
      if (req.userId) {
        await authService.clearAuthCache(req.userId, 'business');
      }

      this.logAction(req, 'BUSINESS_LOGOUT_SUCCESS', {
        businessId: req.userId
      });

      return {
        message: 'Logout successful'
      };
    }, res, 'Logout successful', this.getRequestMeta(req));
  }

  /**
   * GET /api/auth/business/me
   * Get current business profile
   */
  async getProfile(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BUSINESS_PROFILE');

      const business = await businessAuthService.getBusinessById(req.userId!, {
        useCache: true
      });

      this.logAction(req, 'GET_BUSINESS_PROFILE_SUCCESS', {
        businessId: req.userId
        // business data is returned but not logged (could contain sensitive info)
      });

      return { business };
    }, res, 'Business profile retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const businessAuthController = new BusinessAuthController();

