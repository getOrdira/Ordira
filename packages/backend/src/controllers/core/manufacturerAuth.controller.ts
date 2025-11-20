// src/controllers/core/manufacturerAuth.controller.ts
// Manufacturer authentication controller

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from './base.controller';
import { manufacturerAuthService } from '../../services/auth/manufacturer/manufacturerAuth.service';
import { passwordResetService } from '../../services/auth/shared/passwordReset.service';
import { authService } from '../../services/auth';

/**
 * Manufacturer authentication request interfaces
 */
interface RegisterManufacturerRequest extends BaseRequest {
  validatedBody: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    businessName: string;
    businessNumber?: string;
    industry: string;
    website?: string;
    marketingConsent: boolean;
    platformUpdatesConsent: boolean;
  };
}

interface LoginManufacturerRequest extends BaseRequest {
  validatedBody: {
    email: string;
    password: string;
    rememberMe?: boolean;
  };
}

interface VerifyManufacturerRequest extends BaseRequest {
  validatedBody: {
    email: string;
    verificationCode: string;
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
    manufacturerId: string;
  };
}

/**
 * Manufacturer authentication controller
 */
export class ManufacturerAuthController extends BaseController {
  /**
   * POST /api/auth/manufacturer/register
   * Manufacturer registration endpoint
   */
  async register(req: RegisterManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log registration attempt without password
      this.logAction(req, 'MANUFACTURER_REGISTER_ATTEMPT', {
        email: req.validatedBody.email,
        businessName: req.validatedBody.businessName,
        industry: req.validatedBody.industry
        // password is NEVER logged
      });

      const result = await manufacturerAuthService.registerManufacturer({
        email: req.validatedBody.email,
        password: req.validatedBody.password,
        firstName: req.validatedBody.firstName,
        lastName: req.validatedBody.lastName,
        businessName: req.validatedBody.businessName,
        businessNumber: req.validatedBody.businessNumber,
        industry: req.validatedBody.industry,
        website: req.validatedBody.website,
        marketingConsent: req.validatedBody.marketingConsent,
        platformUpdatesConsent: req.validatedBody.platformUpdatesConsent,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing verification code
      this.logAction(req, 'MANUFACTURER_REGISTER_SUCCESS', {
        manufacturerId: result.manufacturerId,
        email: result.email,
        verificationRequired: result.verificationRequired
        // verificationCode is NEVER logged
      });

      return {
        manufacturer: {
          id: result.manufacturerId,
          email: result.email,
          businessName: req.validatedBody.businessName
        },
        message: 'Manufacturer registration successful. Please check your email for verification.',
        verificationRequired: result.verificationRequired
      };
    }, res, 'Manufacturer registration successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/login
   * Manufacturer login endpoint
   */
  async login(req: LoginManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log login attempt without password
      this.logAction(req, 'MANUFACTURER_LOGIN_ATTEMPT', {
        email: req.validatedBody.email,
        rememberMe: req.validatedBody.rememberMe
        // password is NEVER logged
      });

      const result = await manufacturerAuthService.loginManufacturer({
        email: req.validatedBody.email,
        password: req.validatedBody.password,
        rememberMe: req.validatedBody.rememberMe || false,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing tokens
      this.logAction(req, 'MANUFACTURER_LOGIN_SUCCESS', {
        manufacturerId: result.manufacturerId,
        email: result.email,
        name: result.name
        // tokens are NEVER logged
      });

      return {
        manufacturer: {
          id: result.manufacturerId,
          email: result.email,
          name: result.name,
          isEmailVerified: result.isEmailVerified
        },
        token: result.token,
        rememberToken: result.rememberToken
      };
    }, res, 'Manufacturer login successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/verify
   * Manufacturer email verification endpoint
   */
  async verify(req: VerifyManufacturerRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log verification attempt without code
      this.logAction(req, 'MANUFACTURER_VERIFY_ATTEMPT', {
        email: req.validatedBody.email
      });

      const result = await manufacturerAuthService.verifyManufacturer({
        email: req.validatedBody.email,
        verificationCode: req.validatedBody.verificationCode,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      // Log success without exposing token
      this.logAction(req, 'MANUFACTURER_VERIFY_SUCCESS', {
        manufacturerId: result.manufacturerId,
        email: result.email
        // token is NEVER logged
      });

      return {
        manufacturer: {
          id: result.manufacturerId,
          email: result.email
        },
        token: result.token
      };
    }, res, 'Manufacturer email verification successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/forgot-password
   * Forgot password endpoint
   */
  async forgotPassword(req: ForgotPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'MANUFACTURER_FORGOT_PASSWORD_ATTEMPT', {
        email: req.validatedBody.email
      });

      await passwordResetService.initiatePasswordReset({
        email: req.validatedBody.email,
        securityContext: {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      });

      this.logAction(req, 'MANUFACTURER_FORGOT_PASSWORD_SUCCESS', {
        email: req.validatedBody.email
      });

      return {
        message: 'Password reset email sent successfully'
      };
    }, res, 'Password reset email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/reset-password
   * Reset password endpoint
   */
  async resetPassword(req: ResetPasswordRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      // Log reset attempt without token or password
      this.logAction(req, 'MANUFACTURER_RESET_PASSWORD_ATTEMPT');
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
      this.logAction(req, 'MANUFACTURER_RESET_PASSWORD_SUCCESS');

      return {
        message: 'Password reset successful'
      };
    }, res, 'Password reset successful', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/resend-verification
   * Resend verification email endpoint
   */
  async resendVerification(req: ResendVerificationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'MANUFACTURER_RESEND_VERIFICATION_ATTEMPT', {
        manufacturerId: req.validatedBody.manufacturerId
      });

      await manufacturerAuthService.resendManufacturerVerification(req.validatedBody.manufacturerId);

      this.logAction(req, 'MANUFACTURER_RESEND_VERIFICATION_SUCCESS', {
        manufacturerId: req.validatedBody.manufacturerId
      });

      return {
        message: 'Verification email sent successfully'
      };
    }, res, 'Verification email sent', this.getRequestMeta(req));
  }

  /**
   * POST /api/auth/manufacturer/logout
   * Manufacturer logout endpoint
   */
  async logout(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.logAction(req, 'MANUFACTURER_LOGOUT_ATTEMPT', {
        manufacturerId: req.userId
      });

      // Clear auth cache on logout
      if (req.userId) {
        await authService.clearAuthCache(req.userId, 'manufacturer');
      }

      this.logAction(req, 'MANUFACTURER_LOGOUT_SUCCESS', {
        manufacturerId: req.userId
      });

      return {
        message: 'Logout successful'
      };
    }, res, 'Logout successful', this.getRequestMeta(req));
  }

  /**
   * GET /api/auth/manufacturer/me
   * Get current manufacturer profile
   */
  async getProfile(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_MANUFACTURER_PROFILE');

      const manufacturer = await manufacturerAuthService.getManufacturerById(req.userId!, {
        useCache: true
      });

      this.logAction(req, 'GET_MANUFACTURER_PROFILE_SUCCESS', {
        manufacturerId: req.userId
        // manufacturer data is returned but not logged (could contain sensitive info)
      });

      return { manufacturer };
    }, res, 'Manufacturer profile retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerAuthController = new ManufacturerAuthController();

